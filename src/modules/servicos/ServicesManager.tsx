import React, { useState, useEffect } from 'react';
import { Scissors, Plus, Tag, DollarSign, Clock, Users, Check, X, ShieldCheck, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ServicesManager() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.companyId || 'empresa_principal';

  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'professionals'>('services');

  // Service Modal state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    durationMinutes: '30',
    bufferMinutes: '0',
    categoryId: 'geral',
    bookable: true,
    requiresProfessional: true
  });

  // Professional Modal state
  const [showProfModal, setShowProfModal] = useState(false);
  const [editingProf, setEditingProf] = useState<any>(null);
  const [profForm, setProfForm] = useState({
    displayName: '',
    userId: '',
    serviceIds: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resServ, resProf] = await Promise.all([
        fetch('/api/services', { headers }),
        fetch('/api/professionals', { headers })
      ]);
      const dataServ = await resServ.json();
      const dataProf = await resProf.json();

      if (dataServ.success) setServices(dataServ.services || []);
      if (dataProf.success) setProfessionals(dataProf.professionals || []);
    } catch (e) {
      console.error('Erro ao buscar dados de serviços:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const payload = {
        id: editingService?.id,
        ...serviceForm,
        price: Number(serviceForm.price) || 0,
        durationMinutes: Number(serviceForm.durationMinutes) || 30,
        bufferMinutes: Number(serviceForm.bufferMinutes) || 0
      };

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowServiceModal(false);
        setEditingService(null);
        setServiceForm({ name: '', description: '', price: '', durationMinutes: '30', bufferMinutes: '0', categoryId: 'geral', bookable: true, requiresProfessional: true });
        fetchData();
      } else {
        alert(data.error || 'Erro ao salvar serviço.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Deseja realmente excluir este serviço do catálogo?')) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Erro ao excluir serviço.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveProf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const payload = {
        id: editingProf?.id || undefined,
        displayName: profForm.displayName,
        userId: profForm.userId || 'agenda_prof',
        serviceIds: profForm.serviceIds
      };

      const res = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowProfModal(false);
        setEditingProf(null);
        setProfForm({ displayName: '', userId: '', serviceIds: [] });
        fetchData();
      } else {
        alert(data.error || 'Erro ao salvar profissional.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProf = async (id: string) => {
    if (!confirm('Deseja realmente remover este profissional da agenda?')) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/professionals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Erro ao remover profissional.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Serviços & Profissionais</h1>
            <p className="text-xs text-slate-500">Gerencie catálogo de serviços e profissionais habilitados para atendimento e agenda.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'services' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Serviços ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('professionals')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'professionals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Profissionais ({professionals.length})
            </button>
          </div>

          {activeTab === 'services' ? (
            <button
              onClick={() => {
                setEditingService(null);
                setServiceForm({ name: '', description: '', price: '', durationMinutes: '30', bufferMinutes: '0', categoryId: 'geral', bookable: true, requiresProfessional: true });
                setShowServiceModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Serviço</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingProf(null);
                setProfForm({ displayName: '', userId: '', serviceIds: [] });
                setShowProfModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Profissional</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'services' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div key={service.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                      {service.categoryId || 'Geral'}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-2">{service.name}</h3>
                  </div>
                  <span className="text-lg font-black text-emerald-600">R$ {Number(service.price).toFixed(2).replace('.', ',')}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{service.description || 'Sem descrição informada.'}</p>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{service.durationMinutes || service.duration || 30} min</span>
                  </div>
                  {service.bookable && (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] uppercase font-black">Agendável</span>
                  )}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${service.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {service.active !== false ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingService(service);
                      setServiceForm({
                        name: service.name,
                        description: service.description || '',
                        price: service.price.toString(),
                        durationMinutes: (service.durationMinutes || service.duration || 30).toString(),
                        bufferMinutes: (service.bufferMinutes || 0).toString(),
                        categoryId: service.categoryId || 'geral',
                        bookable: service.bookable !== false,
                        requiresProfessional: service.requiresProfessional !== false
                      });
                      setShowServiceModal(true);
                    }}
                    className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition-colors"
                    title="Editar Serviço"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                    title="Excluir Serviço"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {services.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              Nenhum serviço cadastrado. Clique em "Novo Serviço" para começar.
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map(prof => (
            <div key={prof.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-lg">
                      {prof.displayName ? prof.displayName.substring(0, 2).toUpperCase() : prof.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">{prof.displayName || prof.name}</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Profissional da Agenda</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingProf(prof);
                        setProfForm({
                          displayName: prof.displayName || prof.name,
                          userId: prof.userId || 'agenda_prof',
                          serviceIds: prof.serviceIds || []
                        });
                        setShowProfModal(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition-colors"
                      title="Editar Profissional"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProf(prof.id)}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                      title="Remover Profissional"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Serviços Habilitados ({prof.serviceIds?.length || 0})</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {prof.serviceIds?.map((sId: string) => {
                      const s = services.find(x => x.id === sId);
                      return s ? (
                        <span key={sId} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          {s.name}
                        </span>
                      ) : null;
                    })}
                    {(!prof.serviceIds || prof.serviceIds.length === 0) && (
                      <span className="text-xs text-slate-400 italic">Todos os serviços</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {professionals.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              Nenhum profissional cadastrado. Clique em "Novo Profissional" para começar.
            </div>
          )}
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button onClick={() => setShowServiceModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="Ex: Corte de Cabelo Masculino"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={serviceForm.price}
                    onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                    placeholder="40.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Duração (min) *</label>
                  <input
                    type="number"
                    required
                    value={serviceForm.durationMinutes}
                    onChange={e => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })}
                    placeholder="30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Descrição</label>
                <textarea
                  value={serviceForm.description}
                  onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Detalhes opcionais do serviço..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="bookableCheck"
                  checked={serviceForm.bookable}
                  onChange={e => setServiceForm({ ...serviceForm, bookable: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="bookableCheck" className="text-xs font-bold text-slate-700">Permitir Agendamento online / agenda</label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Modal */}
      {showProfModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">
                {editingProf ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button onClick={() => setShowProfModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={profForm.displayName}
                  onChange={e => setProfForm({ ...profForm, displayName: e.target.value })}
                  placeholder="Ex: João Barbeiro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Serviços Habilitados</label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profForm.serviceIds.includes(s.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setProfForm({ ...profForm, serviceIds: [...profForm.serviceIds, s.id] });
                          } else {
                            setProfForm({ ...profForm, serviceIds: profForm.serviceIds.filter(id => id !== s.id) });
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span>{s.name} (R$ {Number(s.price).toFixed(2).replace('.', ',')})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProfModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
