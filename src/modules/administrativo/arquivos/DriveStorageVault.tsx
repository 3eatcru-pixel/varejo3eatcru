import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  Search, 
  RefreshCw, 
  Upload, 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  FileText,
  Database,
  Cloud,
  AlertTriangle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { useCompany } from '../../../contexts/CompanyContext';
import { useToast } from '../../../components/Toast';
import { GoogleWorkspaceService } from '../../../services/workspace/GoogleWorkspaceService';
import { DriveItem, WorkspaceFolderStructure } from '../../../services/workspace/DriveService';
import { BackupService, ComprehensiveBackupManifest } from '../../../services/BackupService';

export default function DriveStorageVault({ user }: { user?: UserProfile }) {
  const { branding } = useCompany();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(GoogleWorkspaceService.getSession());
  const [folders, setFolders] = useState<WorkspaceFolderStructure | null>(null);
  const [activeFolderType, setActiveFolderType] = useState<'backups' | 'reports' | 'documents'>('backups');
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [backupProgress, setBackupProgress] = useState<string | null>(null);

  const companyName = branding?.name || 'VarejoPro Supermercados & Conveniência';
  const companyId = user?.companyId || 'empresa_principal';

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const currentSession = GoogleWorkspaceService.getSession();
    setSession(currentSession);
    if (currentSession) {
      await loadWorkspace(currentSession.accessToken);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      showSuccess('Autenticando com o Google Workspace...', 'Aguarde');
      const newSession = await GoogleWorkspaceService.connect(companyId);
      setSession(newSession);
      showSuccess('Google Drive & Docs conectados com sucesso!', 'Conectado');
      await loadWorkspace(newSession.accessToken);
    } catch (err: any) {
      showError(err.message || 'Erro ao conectar com Google Workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    GoogleWorkspaceService.disconnect();
    setSession(null);
    setFolders(null);
    setFiles([]);
    showSuccess('Desconectado do Google Workspace', 'Pronto');
  };

  const loadWorkspace = async (token: string) => {
    setLoading(true);
    try {
      const folderStruct = await GoogleWorkspaceService.getCompanyFolders(companyName);
      setFolders(folderStruct);
      
      const targetFolderId = activeFolderType === 'backups' 
        ? folderStruct.backupsFolderId 
        : activeFolderType === 'reports' 
        ? folderStruct.reportsFolderId 
        : folderStruct.documentsFolderId;

      const fileList = await GoogleWorkspaceService.listFolderFiles(targetFolderId);
      setFiles(fileList);
    } catch (err: any) {
      console.warn("Erro ao listar arquivos do Drive:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderChange = async (folderType: 'backups' | 'reports' | 'documents') => {
    setActiveFolderType(folderType);
    if (!folders) return;

    setLoading(true);
    try {
      const targetFolderId = folderType === 'backups' 
        ? folders.backupsFolderId 
        : folderType === 'reports' 
        ? folders.reportsFolderId 
        : folders.documentsFolderId;

      const fileList = await GoogleWorkspaceService.listFolderFiles(targetFolderId);
      setFiles(fileList);
    } catch (err: any) {
      showError('Erro ao carregar pasta do Drive: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run un-truncated full backup
  const handleFullBackup = async () => {
    setLoading(true);
    setBackupProgress('Iniciando snapshot completo do banco de dados...');
    try {
      const manifest = await BackupService.generateCompleteBackup(companyId, companyName, (stage) => {
        setBackupProgress(stage);
      });

      setBackupProgress('Enviando cópia integral para a pasta Backups no Google Drive...');
      const result = await BackupService.uploadBackupToGoogleDrive(manifest, companyName);

      showSuccess(`Backup completo (${manifest.counts.products} prods, ${manifest.counts.sales} vendas) salvo no Drive!`, 'Backup Concluído');
      if (folders) {
        const fileList = await GoogleWorkspaceService.listFolderFiles(folders.backupsFolderId);
        setFiles(fileList);
      }
    } catch (err: any) {
      showError('Falha ao gerar backup: ' + err.message);
    } finally {
      setLoading(false);
      setBackupProgress(null);
    }
  };

  // Export executive summary to Google Docs
  const handleExportDocsReport = async () => {
    setLoading(true);
    try {
      showSuccess('Gerando documento no Google Docs...', 'Aguarde');
      const docResult = await GoogleWorkspaceService.exportSalesExecutiveToDoc(
        companyName,
        {
          period: 'Mês Atual',
          totalRevenue: 28490.50,
          ordersCount: 412,
          averageTicket: 69.15,
          topProducts: [
            { name: 'Arroz Tipo 1 5kg', quantity: 180, total: 5382.00 },
            { name: 'Feijão Carioca 1kg', quantity: 154, total: 1370.60 },
            { name: 'Azeite de Oliva Extra Virgem 500ml', quantity: 64, total: 2425.60 }
          ]
        },
        folders?.reportsFolderId
      );

      showSuccess('Relatório executivo gerado no Google Docs!', 'Sucesso');
      window.open(docResult.docUrl, '_blank');
      
      if (folders) {
        const fileList = await GoogleWorkspaceService.listFolderFiles(folders.reportsFolderId);
        setFiles(fileList);
      }
    } catch (err: any) {
      showError('Falha ao gerar Google Doc: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header & Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cloud className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
                Google Workspace & Drive Vault
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Sincronização persistente de backups integrais, relatórios executivos e Google Docs por tenant.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Conectado: {session.email}</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                Conectar Google Workspace
              </button>
            )}
          </div>
        </div>

        {backupProgress && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{backupProgress}</span>
          </div>
        )}
      </div>

      {/* Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Backup Integral</span>
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Snapshot completo do banco (sem limite de 200 vendas), incluindo produtos, clientes, vendas e caixas.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleFullBackup}
              disabled={loading || !session}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              <Upload className="w-3.5 h-3.5" />
              Backup no Drive
            </button>
            <button
              onClick={async () => {
                const manifest = await BackupService.generateCompleteBackup(companyId, companyName);
                BackupService.downloadBackupFile(manifest);
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              title="Baixar cópia JSON direta"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Google Docs API</span>
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Gera DRE e fechamentos diretamente como documentos formatados no Google Docs da sua empresa.
          </p>
          <button
            onClick={handleExportDocsReport}
            disabled={loading || !session}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <FileText className="w-3.5 h-3.5" />
            Gerar Google Doc DRE
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pastas Isoladas</span>
            <Folder className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Diretório raiz no Google Drive: <br />
            <code className="text-amber-300 font-mono text-[11px]">VarejoPro - {companyName}</code>
          </p>
          <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pastas dedicadas: Backups, Relatórios, Docs</span>
          </div>
        </div>
      </div>

      {/* Workspace File Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* Navigation Tabs */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFolderChange('backups')}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeFolderType === 'backups'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Backups do Sistema
            </button>
            <button
              onClick={() => handleFolderChange('reports')}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeFolderType === 'reports'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Relatórios e DRE (Docs)
            </button>
            <button
              onClick={() => handleFolderChange('documents')}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeFolderType === 'documents'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              Documentos & Fechamentos
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar arquivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => session && loadWorkspace(session.accessToken)}
              disabled={loading || !session}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* File Table */}
        <div className="p-4">
          {!session ? (
            <div className="p-12 text-center space-y-3">
              <Cloud className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-black text-slate-300">Google Workspace não conectado</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Conecte sua conta do Google para visualizar e sincronizar os backups e documentos gerados no Google Drive e Google Docs.
              </p>
              <button
                onClick={handleConnect}
                className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                Conectar Agora
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Folder className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-slate-400">Nenhum arquivo encontrado nesta pasta.</p>
              <p className="text-[11px] text-slate-600">
                Use os botões de ação acima para gerar seu primeiro backup integral ou relatório Google Docs.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-800/40 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    {file.mimeType.includes('document') ? (
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                        <FileText className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <Database className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-200">{file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('pt-BR') : 'Data não informada'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
