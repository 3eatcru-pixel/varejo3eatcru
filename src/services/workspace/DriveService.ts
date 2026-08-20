/**
 * Google Drive API v3 Service
 * Manages company folders, comprehensive file upload, list, download, and delete.
 */

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

export interface WorkspaceFolderStructure {
  rootFolderId: string;
  backupsFolderId: string;
  reportsFolderId: string;
  documentsFolderId: string;
}

export class DriveService {
  private static async request<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!res.ok) {
      let errorDetail = `Status: ${res.status}`;
      try {
        const errJson = await res.json();
        errorDetail = errJson.error?.message || errorDetail;
      } catch {}
      throw new Error(`Google Drive API Error: ${errorDetail}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // --- Folder Hierarchy Management ---
  static async findOrCreateFolder(token: string, folderName: string, parentId?: string): Promise<string> {
    const query = [
      `name='${folderName.replace(/'/g, "\\'")}'`,
      `mimeType='application/vnd.google-apps.folder'`,
      `trashed=false`,
      parentId ? `'${parentId}' in parents` : `'root' in parents`
    ].join(' and ');

    const listRes = await this.request<{ files: Array<{ id: string; name: string }> }>(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      token
    );

    if (listRes.files && listRes.files.length > 0) {
      return listRes.files[0].id;
    }

    // Create folder if not found
    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const createRes = await this.request<{ id: string }>(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      }
    );

    return createRes.id;
  }

  static async setupCompanyFolders(token: string, companyName: string): Promise<WorkspaceFolderStructure> {
    const rootName = `VarejoPro - ${companyName || 'Empresa'}`;
    const rootFolderId = await this.findOrCreateFolder(token, rootName);

    const [backupsFolderId, reportsFolderId, documentsFolderId] = await Promise.all([
      this.findOrCreateFolder(token, 'Backups do Sistema', rootFolderId),
      this.findOrCreateFolder(token, 'Relatórios e DRE', rootFolderId),
      this.findOrCreateFolder(token, 'Documentos e Contratos', rootFolderId)
    ]);

    return {
      rootFolderId,
      backupsFolderId,
      reportsFolderId,
      documentsFolderId
    };
  }

  // --- File Operations ---
  static async listFiles(token: string, folderId: string): Promise<DriveItem[]> {
    const query = `'${folderId}' in parents and trashed=false`;
    const res = await this.request<{ files: DriveItem[] }>(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`,
      token
    );
    return res.files || [];
  }

  static async uploadJson(token: string, folderId: string, fileName: string, content: any): Promise<DriveItem> {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(fileMetadata),
      delimiter,
      'Content-Type: application/json\r\n\r\n',
      typeof content === 'string' ? content : JSON.stringify(content, null, 2),
      closeDelimiter
    ].join('');

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro ao enviar arquivo para o Google Drive: ${err}`);
    }

    return res.json();
  }

  static async deleteFile(token: string, fileId: string): Promise<void> {
    await this.request(`https://www.googleapis.com/drive/v3/files/${fileId}`, token, {
      method: 'DELETE'
    });
  }

  static async downloadFile(token: string, fileId: string): Promise<string> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error(`Erro ao baixar arquivo do Google Drive: ${res.statusText}`);
    }
    return res.text();
  }
}
