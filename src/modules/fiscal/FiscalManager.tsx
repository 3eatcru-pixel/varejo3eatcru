import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { FileText, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Key, Eye } from 'lucide-react';
import { db } from '../../lib/firebase';
import { FiscalDocument, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/Toast';

interface FiscalManagerProps {
  user: UserProfile;
}

export default function FiscalManager({ user }: FiscalManagerProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  const fetchApiDocs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/fiscal/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Falha ao buscar docs fiscais via API:", err);
    }

    // Fallback to Firestore
    try {
      const q = query(
        collection(db, 'fiscal_documents'),
        where('companyId', '==', user.companyId || ''),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FiscalDocument)));
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiDocs();
  }, [user.companyId]);

  const handleCancelDoc = async (docId: string) => {
    if (!confirm('Deseja realmente cancelar esta emissão fiscal junto à SEFAZ (Simulação)?')) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token') || localStorage.getItem('auth_token');
      const res = await fetch(`/api/fiscal/cancel/${docId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Cancelamento pelo gestor fiscal' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Documento fiscal cancelado com sucesso!', 'Cancelamento SEFAZ');
        fetchApiDocs();
      } else {
        showError(data.error || 'Erro ao cancelar documento fiscal.');
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-slate-100 space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          <span>Gestão Fiscal & NFC-e <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Produção & Homologação</span></span>
        </h2>
        <button
          type="button"
          onClick={fetchApiDocs}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">ID Venda</th>
              <th className="p-3.5">Tipo</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Protocolo SEFAZ</th>
              <th className="p-3.5">Chave de Acesso</th>
              <th className="p-3.5">Data</th>
              <th className="p-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                  {loading ? 'Carregando documentos fiscais...' : 'Nenhum documento fiscal emitido para esta empresa.'}
                </td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{doc.saleId?.substring(0, 8) || doc.id}</td>
                  <td className="p-3.5 font-bold uppercase">{doc.type || 'NFCE'}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      doc.status === 'AUTHORIZED' ? 'bg-emerald-100 text-emerald-800' :
                      doc.status === 'CANCELLED' ? 'bg-slate-200 text-slate-800' :
                      doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-xs font-mono text-slate-600">{doc.protocol || '-'}</td>
                  <td className="p-3.5 text-[11px] font-mono text-slate-500 max-w-xs truncate" title={doc.accessKey}>
                    {doc.accessKey ? `${doc.accessKey.substring(0, 6)}...${doc.accessKey.substring(38)}` : '-'}
                  </td>
                  <td className="p-3.5 text-xs text-slate-500">{new Date(doc.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {doc.status === 'AUTHORIZED' && (
                        <button
                          type="button"
                          onClick={() => handleCancelDoc(doc.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg border border-rose-200 transition"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
