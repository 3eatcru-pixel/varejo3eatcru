import { TokenManager } from './TokenManager';

export interface GoogleSpreadsheet {
  spreadsheetId: string;
  properties?: {
    title: string;
  };
  spreadsheetUrl?: string;
}

export class GoogleSheetsApiError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'GoogleSheetsApiError';
    this.statusCode = statusCode;
  }
}

export class SheetsService {
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
      let errorMessage = `Google Sheets API Error HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) {
          errorMessage = errJson.error.message || errorMessage;
        }
      } catch {}

      if (res.status === 401) {
        TokenManager.handleUnauthorized();
      }

      throw new GoogleSheetsApiError(errorMessage, res.status);
    }

    return res.json();
  }

  static async createSpreadsheet(token: string, title: string, sheetTitles: string[] = ['Dados']): Promise<GoogleSpreadsheet> {
    const sheets = sheetTitles.map(t => ({ properties: { title: t } }));
    const result = await this.request<GoogleSpreadsheet>('https://sheets.googleapis.com/v4/spreadsheets', token, {
      method: 'POST',
      body: JSON.stringify({
        properties: { title },
        sheets
      })
    });

    return {
      spreadsheetId: result.spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit`
    };
  }

  static async appendValues(
    token: string,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<any> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    return this.request(url, token, {
      method: 'POST',
      body: JSON.stringify({ values })
    });
  }

  static async updateValues(
    token: string,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<any> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    return this.request(url, token, {
      method: 'PUT',
      body: JSON.stringify({ values })
    });
  }

  static async moveSpreadsheetToFolder(token: string, spreadsheetId: string, folderId: string): Promise<void> {
    try {
      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=parents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fileData = await fileRes.json();
      const previousParents = (fileData.parents || []).join(',');

      await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=${previousParents}&fields=id,parents`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (err) {
      console.warn("Could not move spreadsheet to folder:", err);
    }
  }

  /**
   * Exports Sales records to a formatted Google Sheet
   */
  static async exportSalesToSheet(
    token: string,
    companyName: string,
    sales: Array<{
      id: string;
      createdAt: string;
      total: number;
      paymentMethod: string;
      status: string;
      clientName?: string;
    }>,
    folderId?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const title = `Relatório de Vendas - ${companyName} (${new Date().toLocaleDateString('pt-BR')})`;
    const sheet = await this.createSpreadsheet(token, title, ['Vendas']);

    const header = ['ID Venda', 'Data / Hora', 'Cliente', 'Forma de Pagamento', 'Status', 'Valor Total (R$)'];
    const rows = sales.map(s => [
      s.id,
      new Date(s.createdAt).toLocaleString('pt-BR'),
      s.clientName || 'Consumidor Final',
      s.paymentMethod || 'DINHEIRO',
      s.status || 'CONCLUIDA',
      s.total.toFixed(2)
    ]);

    await this.updateValues(token, sheet.spreadsheetId, 'Vendas!A1', [header, ...rows]);

    if (folderId) {
      await this.moveSpreadsheetToFolder(token, sheet.spreadsheetId, folderId);
    }

    return {
      spreadsheetId: sheet.spreadsheetId,
      spreadsheetUrl: sheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit`
    };
  }

  /**
   * Exports Inventory Stock to a formatted Google Sheet
   */
  static async exportStockToSheet(
    token: string,
    companyName: string,
    products: Array<{
      name: string;
      barcode?: string;
      sku?: string;
      stockQuantity: number;
      price: number;
      costPrice?: number;
      category?: string;
    }>,
    folderId?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const title = `Inventário de Estoque - ${companyName} (${new Date().toLocaleDateString('pt-BR')})`;
    const sheet = await this.createSpreadsheet(token, title, ['Estoque']);

    const header = ['Produto', 'Código de Barras', 'SKU', 'Categoria', 'Estoque Atual', 'Preço Custo (R$)', 'Preço Venda (R$)', 'Valor em Estoque (R$)'];
    const rows = products.map(p => {
      const cost = p.costPrice || 0;
      const totalValue = p.stockQuantity * p.price;
      return [
        p.name,
        p.barcode || '-',
        p.sku || '-',
        p.category || 'Geral',
        p.stockQuantity,
        cost.toFixed(2),
        p.price.toFixed(2),
        totalValue.toFixed(2)
      ];
    });

    await this.updateValues(token, sheet.spreadsheetId, 'Estoque!A1', [header, ...rows]);

    if (folderId) {
      await this.moveSpreadsheetToFolder(token, sheet.spreadsheetId, folderId);
    }

    return {
      spreadsheetId: sheet.spreadsheetId,
      spreadsheetUrl: sheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit`
    };
  }
}
