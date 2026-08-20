import { IndexedDBStore } from '../offline/IndexedDBStore';
import { TokenManager } from './TokenManager';
import { DriveService } from './DriveService';
import { DocsService, GoogleDocsApiError } from './DocsService';

export type WorkspaceOpType = 'CREATE_DOC' | 'UPDATE_DOC' | 'UPLOAD_BACKUP' | 'SYNC_CLOSING_DOC' | 'SYNC_SALES_DOC';
export type WorkspaceQueueStatus = 'PENDING' | 'PROCESSING' | 'SYNCED' | 'RETRY' | 'CONFLICT' | 'REQUIRES_REVIEW';

export interface WorkspaceQueueItem {
  id: string;
  companyId: string;
  userId?: string;
  operation: WorkspaceOpType;
  documentId?: string;
  folderId?: string;
  title: string;
  payload: any;
  revisionId?: string;
  createdAt: string;
  attempts: number;
  status: WorkspaceQueueStatus;
  lastError?: string;
  conflictReason?: string;
  resultUrl?: string;
  nextRetryAt?: string;
}

export class OfflineWorkspaceQueue {
  static async getQueue(companyId: string): Promise<WorkspaceQueueItem[]> {
    const items = await IndexedDBStore.getAllByCompany<WorkspaceQueueItem>('workspace_sync_queue', companyId);
    return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  static async enqueue(
    companyId: string,
    operation: WorkspaceOpType,
    title: string,
    payload: any,
    options?: { userId?: string; documentId?: string; folderId?: string; revisionId?: string }
  ): Promise<WorkspaceQueueItem> {
    const item: WorkspaceQueueItem = {
      id: `wsq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      companyId,
      userId: options?.userId,
      operation,
      documentId: options?.documentId,
      folderId: options?.folderId,
      title,
      payload,
      revisionId: options?.revisionId,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'PENDING'
    };

    await IndexedDBStore.put('workspace_sync_queue', item);
    return item;
  }

  /**
   * Exponential backoff for workspace operations.
   */
  static getBackoffDelayMs(attempts: number): number {
    const base = 1000;
    const factor = Math.min(Math.pow(2, attempts - 1), 16);
    return (base * factor) + Math.floor(Math.random() * 300);
  }

  static async processQueue(
    companyId: string,
    companyName: string,
    onProgress?: (synced: number, total: number) => void
  ): Promise<{ successCount: number; failureCount: number; conflicts: number; errors: string[] }> {
    const token = await TokenManager.getValidAccessToken();
    if (!token) {
      return {
        successCount: 0,
        failureCount: 0,
        conflicts: 0,
        errors: ['Google Workspace não autenticado ou token expirado. Itens retidos com segurança na fila offline.']
      };
    }

    const queue = await this.getQueue(companyId);
    const now = Date.now();

    const actionable = queue.filter(item => {
      if (item.status === 'PENDING' || item.status === 'PROCESSING') return true;
      if (item.status === 'RETRY') {
        if (!item.nextRetryAt) return true;
        return now >= new Date(item.nextRetryAt).getTime();
      }
      return false;
    });

    if (actionable.length === 0) {
      return { successCount: 0, failureCount: 0, conflicts: 0, errors: [] };
    }

    let successCount = 0;
    let failureCount = 0;
    let conflicts = 0;
    const errors: string[] = [];

    // Ensure folder structure exists
    let folders;
    try {
      folders = await DriveService.setupCompanyFolders(token, companyName);
    } catch (e: any) {
      return {
        successCount: 0,
        failureCount: actionable.length,
        conflicts: 0,
        errors: [`Falha ao inicializar diretórios no Google Drive: ${e.message}`]
      };
    }

    for (let i = 0; i < actionable.length; i++) {
      const item = actionable[i];
      item.status = 'PROCESSING';
      item.attempts += 1;
      await IndexedDBStore.put('workspace_sync_queue', item);

      try {
        if (item.operation === 'UPLOAD_BACKUP') {
          const res = await DriveService.uploadJson(
            token,
            item.folderId || folders.backupsFolderId,
            item.title,
            item.payload
          );
          item.resultUrl = res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`;
        } else if (item.operation === 'SYNC_CLOSING_DOC') {
          const res = await DocsService.generateCashClosingDoc(
            token,
            companyName,
            item.payload,
            item.folderId || folders.documentsFolderId
          );
          item.documentId = res.documentId;
          item.resultUrl = res.docUrl;
          item.revisionId = res.revisionId;
        } else if (item.operation === 'SYNC_SALES_DOC') {
          const res = await DocsService.generateSalesExecutiveDoc(
            token,
            companyName,
            item.payload,
            item.folderId || folders.reportsFolderId
          );
          item.documentId = res.documentId;
          item.resultUrl = res.docUrl;
        } else if (item.operation === 'CREATE_DOC') {
          const doc = await DocsService.createDocument(token, item.title);
          item.documentId = doc.documentId;
          item.revisionId = doc.revisionId;
          item.resultUrl = `https://docs.google.com/document/d/${doc.documentId}/edit`;
          if (folders.documentsFolderId) {
            await DocsService.moveDocumentToFolder(token, doc.documentId, folders.documentsFolderId);
          }
        }

        item.status = 'SYNCED';
        successCount++;
        await IndexedDBStore.put('workspace_sync_queue', item);

        if (onProgress) onProgress(successCount, actionable.length);
      } catch (err: any) {
        failureCount++;
        const isGoogleError = err instanceof GoogleDocsApiError;
        const isConflict = isGoogleError ? err.isConflict : Boolean(
          err.message?.includes('revisionId') ||
          err.message?.includes('concurrency') ||
          err.message?.includes('conflict')
        );
        const isUnauthorized = isGoogleError ? err.isUnauthorized : Boolean(
          err.message?.includes('401') || err.message?.includes('Unauthorized')
        );

        const errMsg = err.message || 'Erro ao sincronizar item com Google Workspace.';
        item.lastError = errMsg;
        errors.push(`${item.title}: ${errMsg}`);

        if (isConflict) {
          item.status = 'CONFLICT';
          item.conflictReason = 'Conflito de concorrência detectado no Google Docs (revisão remota divergente). O payload original foi preservado.';
          conflicts++;
        } else if (isUnauthorized) {
          item.status = 'RETRY';
          item.conflictReason = 'Aguardando reautenticação com Google Workspace.';
        } else if (item.attempts >= 5) {
          item.status = 'REQUIRES_REVIEW';
          item.conflictReason = `Excedido limite de retries (${item.attempts}). ${errMsg}`;
        } else {
          item.status = 'RETRY';
          const backoff = this.getBackoffDelayMs(item.attempts);
          item.nextRetryAt = new Date(Date.now() + backoff).toISOString();
        }

        await IndexedDBStore.put('workspace_sync_queue', item);
      }
    }

    return { successCount, failureCount, conflicts, errors };
  }

  static async removeItem(id: string): Promise<void> {
    await IndexedDBStore.delete('workspace_sync_queue', id);
  }
}
