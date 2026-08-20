import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, User, CheckCircle, XCircle, AlertCircle, Filter, ChevronLeft, ChevronRight, Scissors, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AppointmentsCalendar({ onSendToPDV }: { onSendToPDV?: (serviceItem: any) => void }) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.companyId || 'empresa_principal';

  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterProf, setFilterProf] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // New appointment form state
  const [form, setForm] = useState({
    customerName: '',
    serviceId: '',
    professionalId: '',
    startAtTime: '09:00',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resAppt, resServ, resProf] = await Promise.all([
        fetch('/api/appointments', { headers }),
        fetch('/api/services', { headers }),
        fetch('/api/professionals', { headers })
      ]);
      const dataAppt = await resAppt.json();
      const dataServ = await resServ.json();
      const dataProf = await resProf.json();

      if (dataAppt.success) setAppointments(dataAppt.appointments || []);
      if (dataServ.success) setServices(dataServ.services || []);
      if (dataProf.success) setProfessionals(dataProf.professionals || []);
    } catch (e) {
      console.error('Erro ao buscar dados da agenda:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const startAtDateTime = `${selectedDate}T${form.startAtTime}:00`;
      const payload = {
        customerName: form.customerName || 'Cliente Balcão',
        serviceId: form.serviceId,
        professionalId: form.professionalId,
        startAt: startAtDateTime,
        notes: form.notes
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({ customerName: '', serviceId: '', professionalId: '', startAtTime: '09:00', notes: '' });
        fetchData();
      } else {
        alert(data.error || 'Erro ao agendar horário.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Erro ao atualizar status.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Deseja realmente excluir este agendamento?')) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Erro ao excluir agendamento.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredAppointments = appointments.filter(appt => {
    const apptDate = appt.startAt?.split('T')[0];
    if (apptDate !== selectedDate) return false;
    if (filterProf !== 'all' && appt.professionalId !== filterProf) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Agenda & Atendimentos</h1>
            <p className="text-xs text-slate-500">Controle de horários, agendamentos e conversão para vendas no PDV.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none"
          />

          <select
            value={filterProf}
            onChange={e => setFilterProf(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none"
          >
            <option value="all">Todos os Profissionais</option>
            {professionals.map(p => (
              <option key={p.id} value={p.id}>{p.displayName}</option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Agenda Grid / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Agendamentos para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} ({filteredAppointments.length})
          </h3>
        </div>

        <div className="space-y-3">
          {filteredAppointments.map(appt => {
            const prof = professionals.find(p => p.id === appt.professionalId);
            const timeStr = new Date(appt.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const endStr = new Date(appt.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={appt.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 py-2 bg-slate-900 text-white rounded-xl text-center font-mono font-black text-xs">
                    {timeStr}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">{appt.customerName}</h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        appt.status === 'CONCLUÍDO' ? 'bg-emerald-100 text-emerald-800' :
                        appt.status === 'CANCELADO' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-indigo-600 mt-0.5">{appt.serviceName} • <span className="text-slate-500 font-medium">Prof: {prof?.displayName || 'Geral'}</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {appt.status !== 'CONCLUÍDO' && appt.status !== 'CANCELADO' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'CONCLUÍDO')}
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </button>
                      <button
                        onClick={() => {
                          if (onSendToPDV) {
                            onSendToPDV({
                              id: appt.serviceId,
                              name: appt.serviceName,
                              price: appt.servicePrice || 0,
                              quantity: 1,
                              isService: true,
                              appointmentId: appt.id
                            });
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Cobrar no PDV</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'CANCELADO')}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteAppointment(appt.id)}
                    title="Excluir agendamento"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredAppointments.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              Nenhum agendamento para esta data.
            </div>
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">Novo Agendamento</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Serviço *</label>
                <select
                  required
                  value={form.serviceId}
                  onChange={e => setForm({ ...form, serviceId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione o serviço...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (R$ {Number(s.price).toFixed(2)} - {s.durationMinutes}min)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Profissional *</label>
                <select
                  required
                  value={form.professionalId}
                  onChange={e => setForm({ ...form, professionalId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione o profissional...</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Data *</label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Horário *</label>
                  <input
                    type="time"
                    required
                    value={form.startAtTime}
                    onChange={e => setForm({ ...form, startAtTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
