import { TokenManager } from './TokenManager';

export class GmailApiError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'GmailApiError';
    this.statusCode = statusCode;
  }
}

export class GmailService {
  private static encodeRFC2822(to: string, subject: string, bodyText: string, fromName?: string): string {
    const fromHeader = fromName ? `${fromName} <me>` : 'me';
    const emailLines = [
      `From: ${fromHeader}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      bodyText
    ];

    const email = emailLines.join('\r\n');
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  static async sendEmail(
    token: string,
    to: string,
    subject: string,
    body: string,
    fromName?: string
  ): Promise<{ id: string; threadId: string }> {
    const raw = this.encodeRFC2822(to, subject, body, fromName);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    });

    if (!res.ok) {
      let errorMessage = `Gmail API Error HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) {
          errorMessage = errJson.error.message || errorMessage;
        }
      } catch {}

      if (res.status === 401) {
        TokenManager.handleUnauthorized();
      }

      throw new GmailApiError(errorMessage, res.status);
    }

    return res.json();
  }

  /**
   * Sends digital receipt/comprovante of sale to client via Gmail
   */
  static async sendSaleReceiptEmail(
    token: string,
    recipientEmail: string,
    companyName: string,
    saleData: {
      saleId: string;
      total: number;
      paymentMethod: string;
      items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
      createdAt: string;
    }
  ): Promise<{ id: string; threadId: string }> {
    const subject = `Comprovante de Compra - ${companyName} (#${saleData.saleId.substring(0, 8)})`;
    const itemLines = saleData.items
      .map(i => `• ${i.name} x${i.quantity} (R$ ${i.unitPrice.toFixed(2)}) = R$ ${i.total.toFixed(2)}`)
      .join('\n');

    const body = [
      `Olá! Obrigado por comprar na ${companyName}.\n`,
      `Segue o comprovante da sua compra realizada em ${new Date(saleData.createdAt).toLocaleString('pt-BR')}:\n`,
      `--- ITENS DO PEDIDO ---`,
      itemLines,
      `\n--- RESUMO DA COMPRA ---`,
      `Forma de Pagamento: ${saleData.paymentMethod.toUpperCase()}`,
      `Valor Total Pago: R$ ${saleData.total.toFixed(2)}\n`,
      `Número do Pedido: ${saleData.saleId}`,
      `Atenciosamente,`,
      `${companyName} & Equipe`
    ].join('\n');

    return this.sendEmail(token, recipientEmail, subject, body, companyName);
  }

  /**
   * Sends financial/cash closing summary report email via Gmail
   */
  static async sendCashClosingAlertEmail(
    token: string,
    recipientEmail: string,
    companyName: string,
    closingData: {
      registerId: string;
      operatorName: string;
      totalSales: number;
      difference: number;
    }
  ): Promise<{ id: string; threadId: string }> {
    const subject = `[ALERTA DE FECHAMENTO DE CAIXA] ${companyName}`;
    const body = [
      `Atenção Gestor,\n`,
      `Um fechamento de caixa foi registrado na empresa ${companyName}:\n`,
      `Operador: ${closingData.operatorName}`,
      `ID Caixa: ${closingData.registerId}`,
      `Total Vendido: R$ ${closingData.totalSales.toFixed(2)}`,
      `Diferença Declarada: R$ ${closingData.difference.toFixed(2)}\n`,
      `Relatório gerado automaticamente pelo VarejoPro Enterprise.`
    ].join('\n');

    return this.sendEmail(token, recipientEmail, subject, body, companyName);
  }
}
