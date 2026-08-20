import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Database, 
  Cloud, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Play, 
  Trash2, 
  FileText, 
  ExternalLink,
  ShieldAlert,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { SyncEngine, OfflineSaleItem } from '../../services/offline/SyncEngine';
import { OfflineWorkspaceQueue, WorkspaceQueueItem } from '../../services/workspace/OfflineWorkspaceQueue';
import { GoogleWorkspaceService } from '../../services/workspace/GoogleWorkspaceService';
import { useToast } from '../../components/Toast';

export default function SyncEngineDiagnostics({ companyId = 'empresa_principal', companyName = 'VarejoPro Supermercados' }: { companyId?: string; companyName?: string }) {
  const { showSuccess, showError, showWarning } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'sales_queue' | 'workspace_queue' | 'conflicts' | 'storage'>('sales_queue');
  const [salesQueue, setSalesQueue] = useState<OfflineSaleItem[]>([]);
  const [wsQueue, setWsQueue] = useState<WorkspaceQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncingSales, setIsSyncingSales] = useState<boolean>(false);
  const [isSyncingWorkspace, setIsSyncingWorkspace] = useState<boolean>(false);

  useEffect(() => {
    loadQueues();
    const unsub = SyncEngine.addListener(() => {
      loadQueues();
    });
    return () => unsub();
  }, [companyId]);

  const loadQueues = async () => {
    setLoading(true);
    try {
      const sales = await SyncEngine.getQueue(companyId);
      setSalesQueue(sales);
      const ws = await OfflineWorkspaceQueue.getQueue(companyId);
      setWsQueue(ws);
    } catch (e) {
      console.warn("Erro ao carregar filas de sincronização:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSales = async () => {
    setIsSyncingSales(true);
    try {
      const res = await SyncEngine.processSync(companyId);
      if (res.successCount > 0) {
        showSuccess(`${res.successCount} venda(s) sincronizadas com sucesso!`, 'Sincronização PDV');
      }
      if (res.conflicts > 0) {
        showWarning(`${res.conflicts} venda(s) entraram em estado de conflito ou revisão.`, 'Conflito Detectado');
      }
      if (res.failureCount > 0 && res.conflicts === 0) {
        showError(`Falha em ${res.failureCount} item(ns).`, 'Erro');
      }
      await loadQueues();
    } catch (err: any) {
      showError('Erro ao executar motor de sincronização: ' + err.message);
    } finally {
      setIsSyncingSales(false);
    }
  };

  const handleSyncWorkspace = async () => {
    setIsSyncingWorkspace(true);
    try {
      const res = await OfflineWorkspaceQueue.processQueue(companyId, companyName);
      if (res.successCount > 0) {
        showSuccess(`${res.successCount} documento(s) sincronizados com Google Workspace!`, 'Workspace Sync');
      }
      if (res.conflicts > 0) {
        showWarning(`${res.conflicts} documento(s) com conflito de concorrência revisionId.`, 'Conflito de Versão');
      }
      if (res.failureCount > 0 && res.conflicts === 0) {
        showError(`Falhas: ${res.errors.join('; ')}`, 'Erro Workspace');
      }
      await loadQueues();
    } catch (err: any) {
      showError('Erro ao sincronizar Workspace: ' + err.message);
    } finally {
      setIsSyncingWorkspace(false);
    }
  };

  const handleForceRetrySale = async (saleId: string) => {
    await SyncEngine.resolveConflictForceSync(saleId, companyId);
    showSuccess('Venda recolocada na fila com prioridade para reprocessamento.', 'Reprocessando');
    await loadQueues();
  };

  const handleDiscardSale = async (saleId: string) => {
    await SyncEngine.discardOfflineSale(saleId, companyId);
    showSuccess('Venda descartada da fila offline.', 'Removido');
    await loadQueues();
  };

  const handleClearAllSales = async () => {
    if (confirm('Tem certeza que deseja limpar TODAS as vendas da fila offline para este tenant?')) {
      await SyncEngine.clearAllSales(companyId);
      showSuccess('Fila offline zerada com sucesso.', 'Fila Limpa');
      await loadQueues();
    }
  };

  const conflictsList = salesQueue.filter(i => i.status === 'CONFLICT' || i.status === 'REQUIRES_REVIEW');

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fila PDV Offline</p>
            <h3 className="text-2xl font-black text-slate-100">{salesQueue.length}</h3>
            <span className="text-[10px] text-slate-500">
              {salesQueue.filter(i => i.status === 'PENDING').length} pendentes
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fila Google Workspace</p>
            <h3 className="text-2xl font-black text-slate-100">{wsQueue.length}</h3>
            <span className="text-[10px] text-slate-500">Docs & Backups no Drive</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Cloud className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conflitos de Estoque/Versão</p>
            <h3 className={`text-2xl font-black ${conflictsList.length > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
              {conflictsList.length}
            </h3>
            <span className="text-[10px] text-slate-500">Exigem reconciliação</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Motor Offline</p>
            <h3 className="text-2xl font-black text-emerald-400">IndexedDB v3</h3>
            <span className="text-[10px] text-slate-500">Tenant-isolated • Transacional</span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar & SubTabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('sales_queue')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'sales_queue'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Fila PDV ({salesQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('workspace_queue')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'workspace_queue'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Google Workspace ({wsQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('conflicts')}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'conflicts'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Conflitos ({conflictsList.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeSubTab === 'sales_queue' && (
            <>
              <button
                onClick={handleSyncSales}
                disabled={isSyncingSales || salesQueue.length === 0}
                className="min-h-[40px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
              >
                <Play className={`w-3.5 h-3.5 ${isSyncingSales ? 'animate-spin' : ''}`} />
                <span>{isSyncingSales ? 'Sincronizando...' : 'Processar Fila PDV'}</span>
              </button>
              <button
                onClick={handleClearAllSales}
                disabled={salesQueue.length === 0}
                className="min-h-[40px] px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </>
          )}

          {activeSubTab === 'workspace_queue' && (
            <button
              onClick={handleSyncWorkspace}
              disabled={isSyncingWorkspace || wsQueue.length === 0}
              className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
            >
              <Play className={`w-3.5 h-3.5 ${isSyncingWorkspace ? 'animate-spin' : ''}`} />
              <span>{isSyncingWorkspace ? 'Sincronizando Workspace...' : 'Processar Fila Docs/Drive'}</span>
            </button>
          )}

          <button
            onClick={loadQueues}
            disabled={loading}
            className="min-h-[40px] min-w-[40px] p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all flex items-center justify-center"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {activeSubTab === 'sales_queue' && (
          <div className="p-4">
            {salesQueue.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200">Fila Offline 100% Sincronizada</h4>
                <p className="text-xs text-slate-500">
                  Nenhuma venda offline pendente no momento para a empresa {companyName}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">ID / Idempotência</th>
                      <th className="py-3 px-3">Terminal / Caixa</th>
                      <th className="py-3 px-3">Itens</th>
                      <th className="py-3 px-3">Total</th>
                      <th className="py-3 px-3">Tentativas</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {salesQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono">
                          <span className="text-indigo-400 font-bold block">{item.id}</span>
                          <span className="text-[10px] text-slate-500">{new Date(item.queuedAt).toLocaleTimeString()}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-300 font-bold block">{item.terminalId || 'PDV-01'}</span>
                          <span className="text-[10px] text-slate-500">{item.branchId || 'Matriz'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {item.payload.cart.length} item(ns)
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                          R$ {item.payload.total.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {item.attempts}x
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.status === 'SYNCED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.status === 'CONFLICT'
                                ? 'bg-amber-500/20 text-amber-300'
                                : item.status === 'PROCESSING'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-indigo-500/20 text-indigo-300'
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.lastError && (
                            <p className="text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={item.lastError}>
                              {item.lastError}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleForceRetrySale(item.id)}
                              className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                            >
                              Reprocessar
                            </button>
                            <button
                              onClick={() => handleDiscardSale(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Descartar venda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'workspace_queue' && (
          <div className="p-4">
            {wsQueue.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200">Fila Google Workspace Sincronizada</h4>
                <p className="text-xs text-slate-500">
                  Nenhuma pendência de upload de backup ou criação de Google Docs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Operação</th>
                      <th className="py-3 px-3">Título / Documento</th>
                      <th className="py-3 px-3">Criado em</th>
                      <th className="py-3 px-3">Revision ID</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Link / Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {wsQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                          {item.operation}
                        </td>
                        <td className="py-3 px-3 text-slate-200 font-semibold">
                          {item.title}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-purple-400">
                          {item.revisionId || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.status === 'SYNCED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.status === 'CONFLICT'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.resultUrl ? (
                            <a
                              href={item.resultUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver Documento
                            </a>
                          ) : (
                            <button
                              onClick={() => OfflineWorkspaceQueue.removeItem(item.id).then(loadQueues)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'conflicts' && (
          <div className="p-4">
            {conflictsList.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200">Zero Conflitos Registrados</h4>
                <p className="text-xs text-slate-500">
                  Todas as vendas e documentos sincronizados sem divergências de concorrência.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conflictsList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[10px] rounded-lg">
                          CONFLITO DE ESTOQUE / TRANSAÇÃO
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-200">{item.id}</span>
                      </div>
                      <p className="text-xs text-amber-200 font-medium">
                        {item.conflictReason || item.lastError}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Venda de R$ {item.payload.total.toFixed(2)} contendo {item.payload.cart.length} itens.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleForceRetrySale(item.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Forçar Baixa / Reprocessar
                      </button>
                      <button
                        onClick={() => handleDiscardSale(item.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
