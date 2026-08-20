import { TokenManager, GoogleAuthSession } from './TokenManager';
import { DriveService, DriveItem, WorkspaceFolderStructure } from './DriveService';
import { DocsService, GoogleDoc } from './DocsService';
import { SheetsService } from './SheetsService';
import { GmailService } from './GmailService';
import { OfflineWorkspaceQueue, WorkspaceQueueItem, WorkspaceOpType } from './OfflineWorkspaceQueue';

export class GoogleWorkspaceService {
  // --- OAuth & Authentication ---
  static async connect(companyId?: string): Promise<GoogleAuthSession> {
    try {
      const token = 'gworkspace_token_' + Date.now();
      const session: GoogleAuthSession = {
        accessToken: token,
        email: 'gestor@empresa.com.br',
        name: 'Gestor Google Workspace',
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://mail.google.com/'
        ],
        expiresAt: Date.now() + 3600 * 1000, // 1 hour validity
        connectedAt: new Date().toISOString()
      };

      TokenManager.saveSession(session);
      return session;
    } catch (error: any) {
      console.error("[GoogleWorkspaceService] Erro ao conectar:", error);
      throw error;
    }
  }

  static disconnect(): void {
    TokenManager.clearSession();
  }

  static isConnected(): boolean {
    return TokenManager.isConnected();
  }

  static getSession(): GoogleAuthSession | null {
    return TokenManager.getSession();
  }

  // --- Drive Operations ---
  static async getCompanyFolders(companyName: string): Promise<WorkspaceFolderStructure> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return DriveService.setupCompanyFolders(token, companyName);
  }

  static async listFolderFiles(folderId: string): Promise<DriveItem[]> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return DriveService.listFiles(token, folderId);
  }

  static async uploadBackupToDrive(
    companyName: string,
    fileName: string,
    backupData: any,
    folderId?: string
  ): Promise<DriveItem> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    
    let targetFolderId = folderId;
    if (!targetFolderId) {
      const folders = await DriveService.setupCompanyFolders(token, companyName);
      targetFolderId = folders.backupsFolderId;
    }

    return DriveService.uploadJson(token, targetFolderId, fileName, backupData);
  }

  // --- Docs Operations ---
  static async createDoc(title: string): Promise<GoogleDoc> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return DocsService.createDocument(token, title);
  }

  static async exportCashClosingToDoc(
    companyName: string,
    closingData: any,
    folderId?: string
  ): Promise<{ documentId: string; docUrl: string }> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return DocsService.generateCashClosingDoc(token, companyName, closingData, folderId);
  }

  static async exportSalesExecutiveToDoc(
    companyName: string,
    stats: any,
    folderId?: string
  ): Promise<{ documentId: string; docUrl: string }> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return DocsService.generateSalesExecutiveDoc(token, companyName, stats, folderId);
  }

  // --- Sheets Operations ---
  static async exportSalesToSheet(
    companyName: string,
    sales: any[],
    folderId?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return SheetsService.exportSalesToSheet(token, companyName, sales, folderId);
  }

  static async exportStockToSheet(
    companyName: string,
    products: any[],
    folderId?: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return SheetsService.exportStockToSheet(token, companyName, products, folderId);
  }

  // --- Gmail Operations ---
  static async sendSaleReceiptEmail(
    recipientEmail: string,
    companyName: string,
    saleData: any
  ): Promise<{ id: string; threadId: string }> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return GmailService.sendSaleReceiptEmail(token, recipientEmail, companyName, saleData);
  }

  static async sendCashClosingAlertEmail(
    recipientEmail: string,
    companyName: string,
    closingData: any
  ): Promise<{ id: string; threadId: string }> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) throw new Error("Google Workspace não conectado.");
    return GmailService.sendCashClosingAlertEmail(token, recipientEmail, companyName, closingData);
  }

  // --- Offline Queuing & Background Sync ---
  static async queueOfflineWorkspaceAction(
    companyId: string,
    operation: WorkspaceOpType,
    title: string,
    payload: any,
    options?: { userId?: string; documentId?: string; folderId?: string }
  ): Promise<WorkspaceQueueItem> {
    return OfflineWorkspaceQueue.enqueue(companyId, operation, title, payload, options);
  }

  static async processWorkspaceQueue(
    companyId: string,
    companyName: string,
    onProgress?: (synced: number, total: number) => void
  ) {
    return OfflineWorkspaceQueue.processQueue(companyId, companyName, onProgress);
  }

  static async getWorkspaceQueue(companyId: string): Promise<WorkspaceQueueItem[]> {
    return OfflineWorkspaceQueue.getQueue(companyId);
  }
}

