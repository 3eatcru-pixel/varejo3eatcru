import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { FileText, Search, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { FiscalDocument, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/Toast';

interface FiscalManagerProps {
  user: UserProfile;
}

export default function FiscalManager({ user }: FiscalManagerProps) {
  const { showSuccess, showError } = useToast();
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [user.companyId]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-slate-100 space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          <span>Gestão Fiscal & NFC-e <span className="ml-2 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Modo Demonstração</span></span>
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">ID Venda</th>
              <th className="p-3.5">Tipo</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Protocolo</th>
              <th className="p-3.5">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                  Nenhum documento fiscal emitido para esta empresa.
                </td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{doc.saleId}</td>
                  <td className="p-3.5 font-bold uppercase">{doc.type}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      doc.status === 'AUTHORIZED' ? 'bg-emerald-100 text-emerald-800' :
                      doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-xs font-mono text-slate-600">{doc.protocol || '-'}</td>
                  <td className="p-3.5 text-xs text-slate-500">{new Date(doc.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
