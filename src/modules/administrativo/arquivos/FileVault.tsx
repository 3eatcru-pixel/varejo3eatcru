import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../types';
import { Archive, Upload, File, FileText, Image as ImageIcon, Trash2, Download, Search, Loader2, HardDrive, ShieldCheck, AlertCircle } from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface FileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  mimetype: string;
  createdAt: string;
}

export default function FileVault({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showInfo } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Simulation of file fetching
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call to GET /api/files
      const dummyFiles: FileItem[] = [
        { id: '1', name: 'contrato_social.pdf', url: '#', size: 1024 * 450, mimetype: 'application/pdf', createdAt: new Date().toISOString() },
        { id: '2', name: 'logo_alta_resolucao.png', url: '#', size: 1024 * 850, mimetype: 'image/png', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', name: 'comprovante_fiscal_julho.jpg', url: '#', size: 1024 * 120, mimetype: 'image/jpeg', createdAt: new Date(Date.now() - 172800000).toISOString() },
      ];
      setFiles(dummyFiles);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('O arquivo excede o limite de 2MB estabelecido para o seu plano.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        showSuccess(`Arquivo "${file.name}" enviado com sucesso e armazenado de forma segura.`);
        // Refresh or add to list
        const newFile: FileItem = {
          id: Math.random().toString(),
          name: file.name,
          url: data.url,
          size: file.size,
          mimetype: file.type,
          createdAt: new Date().toISOString()
        };
        setFiles([newFile, ...files]);
      } else {
        showError(data.error || 'Erro ao realizar upload.');
      }
    } catch (err) {
      showError('Falha na conexão com o servidor de armazenamento.');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Archive className="w-6 h-6 text-slate-700" />
              Cofre de Arquivos & Documentos
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Armazenamento seguro com isolamento de tenant e auditoria de acesso
            </p>
          </div>
          
          <label className="cursor-pointer px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Enviando...' : 'Enviar Novo Arquivo'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>

        {/* Storage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-2xl">
              <HardDrive className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Espaço Utilizado</p>
              <p className="text-lg font-black text-slate-900">1.4 MB / 50 MB</p>
              <div className="w-32 bg-slate-100 h-1.5 rounded-full mt-1">
                <div className="bg-slate-900 h-full w-[3%]" />
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Segurança de Dados</p>
              <p className="text-lg font-black text-emerald-600">ISOLADO</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tenant Encryption Active</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Total de Arquivos</p>
              <p className="text-lg font-black text-slate-900">{files.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Documentos & Mídias</p>
            </div>
          </div>
        </div>

        {/* Browser */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          {/* Browser Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar nos arquivos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* File Grid */}
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Carregando seu cofre...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                  <Archive className="w-8 h-8 opacity-20" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Nenhum arquivo encontrado</h3>
                <p className="text-xs font-medium mt-1">Sua busca não retornou resultados ou o cofre está vazio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="group relative bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col items-center text-center space-y-3 hover:border-slate-900 hover:bg-white hover:shadow-xl transition-all cursor-pointer">
                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      {file.mimetype.includes('image') ? <ImageIcon className="w-6 h-6" /> : <File className="w-6 h-6" />}
                    </div>
                    <div className="w-full">
                      <p className="text-[11px] font-black text-slate-900 truncate px-2 leading-tight group-hover:text-slate-900">{file.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{formatSize(file.size)}</p>
                    </div>
                    
                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-white text-slate-600 rounded-lg shadow-md border border-slate-100 hover:text-emerald-600">
                        <Download className="w-3 h-3" />
                      </button>
                      <button className="p-1.5 bg-white text-slate-600 rounded-lg shadow-md border border-slate-100 hover:text-rose-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-start gap-4">
          <div className="p-2 bg-emerald-500 text-white rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Armazenamento Auditado</h4>
            <p className="text-xs text-emerald-700 font-medium leading-relaxed mt-1">
              Todos os arquivos no seu cofre são acessíveis apenas por usuários autorizados da sua empresa. Cada visualização ou download gera uma entrada no log de auditoria para garantir a conformidade com a LGPD e políticas internas de segurança.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
