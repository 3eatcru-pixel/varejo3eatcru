import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Monitor, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Printer, 
  Scan, 
  Scale, 
  Save, 
  X,
  Radio
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Branch, Terminal, UserProfile } from '../../../types';
import { useToast } from '../../../components/Toast';
import { logAuditEvent } from '../../../lib/auditLogger';

interface BranchTerminalSectionProps {
  user: UserProfile;
}

export default function BranchTerminalSection({ user }: BranchTerminalSectionProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const companyId = user.companyId || '';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(false);

  // Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCnpj, setBranchCnpj] = useState('');
  const [branchCity, setBranchCity] = useState('');

  // Terminal Modal
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [terminalCode, setTerminalCode] = useState('');
  const [terminalName, setTerminalName] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [hasCashDrawer, setHasCashDrawer] = useState(true);
  const [hasBarcodeScanner, setHasBarcodeScanner] = useState(true);
  const [hasScale, setHasScale] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Branches
      const bSnap = await getDocs(query(collection(db, 'branches'), where('companyId', '==', companyId)));
      const bList: Branch[] = [];
      bSnap.forEach(d => bList.push({ id: d.id, ...d.data() } as Branch));
      bList.sort((a, b) => a.code.localeCompare(b.code));
      setBranches(bList);

      // 2. Terminals
      const tSnap = await getDocs(query(collection(db, 'terminals'), where('companyId', '==', companyId)));
      const tList: Terminal[] = [];
      tSnap.forEach(d => tList.push({ id: d.id, ...d.data() } as Terminal));
      tList.sort((a, b) => a.code.localeCompare(b.code));
      setTerminals(tList);
    } catch (err: any) {
      console.error('Erro ao carregar filiais e terminais:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchCode(branch.code);
      setBranchName(branch.name);
      setBranchCnpj(branch.cnpj || '');
      setBranchCity(branch.city || '');
    } else {
      setEditingBranch(null);
      setBranchCode(`FIL-0${branches.length + 1}`);
      setBranchName(branches.length === 0 ? 'Matriz Principal' : `Filial ${branches.length + 1}`);
      setBranchCnpj('');
      setBranchCity('');
    }
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      showWarning('Informe o nome da filial.', 'Atenção');
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const payload: Omit<Branch, 'id'> = {
        code: branchCode.trim() || 'MATRIZ',
        name: branchName.trim(),
        cnpj: branchCnpj.trim() || undefined,
        city: branchCity.trim() || undefined,
        isActive: true,
        companyId,
        createdAt: editingBranch?.createdAt || nowIso
      };

      if (editingBranch) {
        await updateDoc(doc(db, 'branches', editingBranch.id), payload);
        showSuccess(`Filial '${payload.name}' atualizada com sucesso!`, 'Filial Atualizada');
      } else {
        await addDoc(collection(db, 'branches'), payload);
        showSuccess(`Filial '${payload.name}' cadastrada com sucesso!`, 'Filial Criada');
      }

      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        action: editingBranch ? 'EDICAO_FILIAL' : 'CRIACAO_FILIAL',
        module: 'ADMINISTRATIVO',
        companyId,
        details: `Filial ${payload.code} - ${payload.name}`
      });

      setIsBranchModalOpen(false);
      loadData();
    } catch (err: any) {
      showError('Erro ao salvar filial: ' + err.message, 'Falha');
    }
  };

  const handleDeleteBranch = async (b: Branch) => {
    const attachedTerminals = terminals.filter(t => t.branchId === b.id);
    if (attachedTerminals.length > 0) {
      showWarning(`Não é possível excluir a filial pois existem ${attachedTerminals.length} terminal(is) vinculados a ela.`, 'Vínculo Ativo');
      return;
    }

    if (!confirm(`Confirma a exclusão da filial '${b.name}'?`)) return;

    try {
      await deleteDoc(doc(db, 'branches', b.id));
      showSuccess(`Filial '${b.name}' excluída!`, 'Excluído');
      loadData();
    } catch (err: any) {
      showError('Erro ao excluir: ' + err.message, 'Erro');
    }
  };

  const handleOpenTerminalModal = (term?: Terminal) => {
    if (term) {
      setEditingTerminal(term);
      setTerminalCode(term.code);
      setTerminalName(term.name);
      setSelectedBranchId(term.branchId);
      setPaperWidth(term.printerPaperWidth || '80mm');
      setHasCashDrawer(term.hasCashDrawer ?? true);
      setHasBarcodeScanner(term.hasBarcodeScanner ?? true);
      setHasScale(term.hasScale ?? false);
    } else {
      setEditingTerminal(null);
      setTerminalCode(`PDV-0${terminals.length + 1}`);
      setTerminalName(`Caixa Principal ${terminals.length + 1}`);
      setSelectedBranchId(branches[0]?.id || '');
      setPaperWidth('80mm');
      setHasCashDrawer(true);
      setHasBarcodeScanner(true);
      setHasScale(false);
    }
    setIsTerminalModalOpen(true);
  };

  const handleSaveTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalName.trim()) {
      showWarning('Informe o nome/descrição do terminal PDV.', 'Atenção');
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const branchObj = branches.find(b => b.id === selectedBranchId);

      const payload: Omit<Terminal, 'id'> = {
        code: terminalCode.trim() || 'PDV-01',
        name: terminalName.trim(),
        branchId: selectedBranchId || branches[0]?.id || 'MATRIZ',
        branchName: branchObj?.name || 'Matriz Principal',
        printerPaperWidth: paperWidth,
        hasCashDrawer,
        hasBarcodeScanner,
        hasScale,
        status: 'ACTIVE',
        companyId,
        createdAt: editingTerminal?.createdAt || nowIso
      };

      if (editingTerminal) {
        await updateDoc(doc(db, 'terminals', editingTerminal.id), payload);
        showSuccess(`Terminal PDV '${payload.name}' atualizado com sucesso!`, 'Terminal Atualizado');
      } else {
        await addDoc(collection(db, 'terminals'), payload);
        showSuccess(`Terminal PDV '${payload.name}' cadastrado com sucesso!`, 'Terminal Criado');
      }

      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        action: editingTerminal ? 'EDICAO_TERMINAL' : 'CRIACAO_TERMINAL',
        module: 'ADMINISTRATIVO',
        companyId,
        details: `Terminal ${payload.code} (${payload.branchName})`
      });

      setIsTerminalModalOpen(false);
      loadData();
    } catch (err: any) {
      showError('Erro ao salvar terminal PDV: ' + err.message, 'Falha');
    }
  };

  const handleDeleteTerminal = async (t: Terminal) => {
    if (!confirm(`Confirma a exclusão do terminal '${t.name}'?`)) return;

    try {
      await deleteDoc(doc(db, 'terminals', t.id));
      showSuccess(`Terminal '${t.name}' excluído!`, 'Excluído');
      loadData();
    } catch (err: any) {
      showError('Erro ao excluir terminal: ' + err.message, 'Erro');
    }
  };

  return (
    <div className="space-y-6">
      {/* Branches Header & Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                Filiais & Unidades Operacionais
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie as lojas físicas, matriz e centros de distribuição da sua empresa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBranchModal()}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Filial</span>
          </button>
        </div>

        {branches.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
            Nenhuma filial cadastrada. Clique no botão acima para adicionar a Matriz ou Filial.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(b => (
              <div key={b.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative group">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                      {b.code}
                    </span>
                    <h3 className="text-sm font-black text-white mt-1.5">{b.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenBranchModal(b)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Editar filial"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBranch(b)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Excluir filial"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  {b.cnpj && <p>CNPJ: <span className="text-slate-300 font-mono">{b.cnpj}</span></p>}
                  {b.city && <p>Cidade: <span className="text-slate-300">{b.city}</span></p>}
                  <p className="text-[11px] text-slate-500">
                    Terminais vinculados: <span className="text-emerald-400 font-bold">{terminals.filter(t => t.branchId === b.id).length}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terminals & Hardware Configuration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                Terminais PDV & Dispositivos Físicos
              </h2>
              <p className="text-xs text-slate-400">
                Configure impressoras térmicas (58/80mm), gavetas automáticas, leitores de código e balanças por caixa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenTerminalModal()}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Terminal PDV</span>
          </button>
        </div>

        {terminals.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
            Nenhum terminal PDV cadastrado. Adicione um terminal para mapear periféricos como impressoras e leitores.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terminals.map(t => (
              <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                      {t.code}
                    </span>
                    <h3 className="text-sm font-black text-white mt-1.5">{t.name}</h3>
                    <p className="text-[11px] text-slate-400">Filial: {t.branchName || 'Matriz'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenTerminalModal(t)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Editar terminal"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTerminal(t)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Excluir terminal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Peripherals summary tags */}
                <div className="pt-2 border-t border-slate-900 flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                    <Printer className="w-3 h-3 text-emerald-400" />
                    {t.printerPaperWidth || '80mm'}
                  </span>
                  {t.hasCashDrawer && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-blue-400" />
                      Gaveta Auto
                    </span>
                  )}
                  {t.hasBarcodeScanner && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                      <Scan className="w-3 h-3 text-amber-400" />
                      Leitor EAN
                    </span>
                  )}
                  {t.hasScale && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                      <Scale className="w-3 h-3 text-purple-400" />
                      Balança
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setIsBranchModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              {editingBranch ? 'Editar Filial' : 'Nova Filial / Unidade'}
            </h3>

            <form onSubmit={handleSaveBranch} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Código Identificador</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: FIL-01, MATRIZ"
                  value={branchCode}
                  onChange={e => setBranchCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Nome da Filial / Loja</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Loja Centro, Loja Shopping"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">CNPJ da Unidade (Opcional)</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={branchCnpj}
                  onChange={e => setBranchCnpj(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Cidade / Estado</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - SP"
                  value={branchCity}
                  onChange={e => setBranchCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl uppercase"
                >
                  Salvar Filial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      {isTerminalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setIsTerminalModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-400" />
              {editingTerminal ? 'Editar Terminal PDV' : 'Novo Terminal PDV'}
            </h3>

            <form onSubmit={handleSaveTerminal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Código do Caixa</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PDV-01, PDV-02"
                  value={terminalCode}
                  onChange={e => setTerminalCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Nome / Identificação</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Caixa 01 - Entrada"
                  value={terminalName}
                  onChange={e => setTerminalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Filial Vinculada</label>
                <select
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-blue-500"
                >
                  {branches.length === 0 ? (
                    <option value="">Matriz Padrão</option>
                  ) : (
                    branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Hardware Peripherals Toggle */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <label className="block text-slate-400 font-bold uppercase text-[10px]">
                  Periféricos & Dispositivos
                </label>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-300">Largura Bobina Térmica:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperWidth('80mm')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${paperWidth === '80mm' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                    >
                      80mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperWidth('58mm')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${paperWidth === '58mm' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                    >
                      58mm
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCashDrawer}
                    onChange={e => setHasCashDrawer(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-500"
                  />
                  <span className="font-bold text-slate-300">Abertura de Gaveta Automática via Impressora</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBarcodeScanner}
                    onChange={e => setHasBarcodeScanner(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-500"
                  />
                  <span className="font-bold text-slate-300">Leitor Óptico de Código de Barras (EAN-13)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasScale}
                    onChange={e => setHasScale(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-500"
                  />
                  <span className="font-bold text-slate-300">Balança de Pesagem de Produtos no Checkout</span>
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTerminalModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black rounded-xl uppercase"
                >
                  Salvar Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
