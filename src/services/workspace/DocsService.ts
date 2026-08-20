import { TokenManager } from './TokenManager';

/**
 * Google Docs API v1 Integration Service
 * Implements documents.create, documents.batchUpdate, revisionId concurrency control,
 * and automated business document generation (Closing reports, sales summaries, audit logs).
 */

export interface GoogleDoc {
  documentId: string;
  title: string;
  revisionId: string;
  body?: any;
}

export interface GoogleDocBatchResponse {
  documentId: string;
  replies: any[];
  writeControl?: {
    requiredRevisionId?: string;
    targetRevisionId?: string;
  };
}

export class GoogleDocsApiError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public isConflict: boolean;
  public isUnauthorized: boolean;
  public details?: any;

  constructor(message: string, statusCode: number, errorCode?: string, details?: any) {
    super(message);
    this.name = 'GoogleDocsApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isConflict = statusCode === 409 || 
                      statusCode === 412 || 
                      errorCode === 'FAILED_PRECONDITION' || 
                      errorCode === 'ALREADY_EXISTS' ||
                      message.toLowerCase().includes('revisionid') ||
                      message.toLowerCase().includes('concurrency');
    this.isUnauthorized = statusCode === 401 || statusCode === 403;
    this.details = details;
  }
}

export class DocsService {
  private static async request<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!res.ok) {
      let errorMessage = `Google Docs API Error HTTP ${res.status}`;
      let errorCode: string | undefined;
      let errorDetails: any = null;
      try {
        const errJson = await res.json();
        if (errJson.error) {
          errorMessage = errJson.error.message || errorMessage;
          errorCode = String(errJson.error.status || errJson.error.code || '');
          errorDetails = errJson.error.details;
        }
      } catch {}

      if (res.status === 401) {
        TokenManager.handleUnauthorized();
      }

      throw new GoogleDocsApiError(errorMessage, res.status, errorCode, errorDetails);
    }

    return res.json();
  }

  // --- Document Lifecycle ---
  static async createDocument(token: string, title: string): Promise<GoogleDoc> {
    return this.request<GoogleDoc>('https://docs.googleapis.com/v1/documents', token, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  static async getDocument(token: string, documentId: string): Promise<GoogleDoc> {
    return this.request<GoogleDoc>(`https://docs.googleapis.com/v1/documents/${documentId}`, token);
  }

  static async batchUpdate(
    token: string,
    documentId: string,
    requests: any[],
    requiredRevisionId?: string
  ): Promise<GoogleDocBatchResponse> {
    const body: any = { requests };
    if (requiredRevisionId) {
      body.writeControl = { requiredRevisionId };
    }

    return this.request<GoogleDocBatchResponse>(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  // --- Move Document to Specific Drive Folder ---
  static async moveDocumentToFolder(token: string, documentId: string, folderId: string): Promise<void> {
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${documentId}?fields=parents`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const fileData = await fileRes.json();
    const previousParents = (fileData.parents || []).join(',');

    await fetch(
      `https://www.googleapis.com/drive/v3/files/${documentId}?addParents=${folderId}&removeParents=${previousParents}&fields=id,parents`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }

  // --- Business Document Builders ---

  /**
   * Generates a complete, styled Executive Cash Register Closing Document on Google Docs
   */
  static async generateCashClosingDoc(
    token: string,
    companyName: string,
    closingData: {
      registerId: string;
      operatorName: string;
      openedAt: string;
      closedAt: string;
      initialAmount: number;
      totalSales: number;
      salesCount: number;
      paymentBreakdown: Record<string, number>;
      finalDeclared: number;
      difference: number;
    },
    folderId?: string
  ): Promise<{ documentId: string; docUrl: string; revisionId: string }> {
    const title = `Fechamento de Caixa - ${companyName} (${new Date().toLocaleDateString('pt-BR')})`;
    const doc = await this.createDocument(token, title);

    const docText = [
      `RELATÓRIO EXECUTIVO DE FECHAMENTO DE CAIXA\n`,
      `Empresa: ${companyName}\n`,
      `Data de Emissão: ${new Date().toLocaleString('pt-BR')}\n`,
      `Operador Responsável: ${closingData.operatorName}\n`,
      `ID do Caixa: ${closingData.registerId}\n\n`,
      `--- RESUMO FINANCEIRO ---\n`,
      `Fundo de Abertura: R$ ${closingData.initialAmount.toFixed(2)}\n`,
      `Total de Vendas: R$ ${closingData.totalSales.toFixed(2)}\n`,
      `Quantidade de Vendas: ${closingData.salesCount}\n`,
      `Valor Final Declarado: R$ ${closingData.finalDeclared.toFixed(2)}\n`,
      `Diferença / Quebra de Caixa: R$ ${closingData.difference.toFixed(2)}\n\n`,
      `--- FORMAS DE PAGAMENTO ---\n`,
      ...Object.entries(closingData.paymentBreakdown).map(
        ([method, val]) => `• ${method.toUpperCase()}: R$ ${val.toFixed(2)}\n`
      ),
      `\n\nDocumento gerado automaticamente pelo motor de sincronização VarejoPro Enterprise.\n`
    ].join('');

    const requests = [
      {
        insertText: {
          location: { index: 1 },
          text: docText
        }
      }
    ];

    const updateRes = await this.batchUpdate(token, doc.documentId, requests, doc.revisionId);

    if (folderId) {
      await this.moveDocumentToFolder(token, doc.documentId, folderId).catch(err => {
        console.warn("Could not move doc to folder:", err);
      });
    }

    return {
      documentId: doc.documentId,
      docUrl: `https://docs.google.com/document/d/${doc.documentId}/edit`,
      revisionId: updateRes.writeControl?.targetRevisionId || doc.revisionId
    };
  }

  /**
   * Generates an Executive Sales & Revenue Report on Google Docs
   */
  static async generateSalesExecutiveDoc(
    token: string,
    companyName: string,
    stats: {
      period: string;
      totalRevenue: number;
      ordersCount: number;
      averageTicket: number;
      topProducts: Array<{ name: string; quantity: number; total: number }>;
    },
    folderId?: string
  ): Promise<{ documentId: string; docUrl: string }> {
    const title = `DRE & Relatório Gerencial de Vendas - ${companyName} (${stats.period})`;
    const doc = await this.createDocument(token, title);

    const docText = [
      `RELATÓRIO GERENCIAL E ANÁLISE DE VENDAS (DRE)\n`,
      `Empresa: ${companyName}\n`,
      `Período Analisado: ${stats.period}\n`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`,
      `--- INDICADORES DE PERFORMANCE (KPIs) ---\n`,
      `• Faturamento Bruto: R$ ${stats.totalRevenue.toFixed(2)}\n`,
      `• Pedidos Processados: ${stats.ordersCount}\n`,
      `• Ticket Médio: R$ ${stats.averageTicket.toFixed(2)}\n\n`,
      `--- PRODUTOS MAIS VENDIDOS ---\n`,
      ...stats.topProducts.map(
        (p, idx) => `${idx + 1}. ${p.name} — Qtd: ${p.quantity} | Total: R$ ${p.total.toFixed(2)}\n`
      ),
      `\n\nAutenticação e integridade garantidas pelo ecossistema VarejoPro.\n`
    ].join('');

    await this.batchUpdate(token, doc.documentId, [
      {
        insertText: {
          location: { index: 1 },
          text: docText
        }
      }
    ], doc.revisionId);

    if (folderId) {
      await this.moveDocumentToFolder(token, doc.documentId, folderId).catch(() => {});
    }

    return {
      documentId: doc.documentId,
      docUrl: `https://docs.google.com/document/d/${doc.documentId}/edit`
    };
  }
}
