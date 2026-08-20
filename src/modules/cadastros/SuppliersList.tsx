import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  UserCheck,
  Download,
  MessageSquare,
  Sparkles 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { Supplier, Product, UserProfile } from '../../types';
import { createSupplier, updateSupplier, deleteSupplier } from '../../services/SupplierService';
import { fetchCnpjDetails } from '../../services/BrasilApiService';
import { useToast } from '../../components/Toast';
import SupplierContactHubModal from './SupplierContactHubModal';

export default function SuppliersList({ user }: { user?: UserProfile }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [contactSupplier, setContactSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Form
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  const companyId = user?.companyId || '';

  const handleConsultarCnpj = async () => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      showWarning('Digite os 14 dígitos do CNPJ para realizar a consulta.', 'CNPJ Inválido');
      return;
    }

    setSearchingCnpj(true);
    try {
      const data = await fetchCnpjDetails(clean);
      if (data.razaoSocial) setName(data.razaoSocial);
      if (data.telefone && !phone) setPhone(data.telefone);
      if (data.email && !email) setEmail(data.email);
      
      const fullAddr = [
        data.logradouro ? `${data.logradouro}, ${data.numero || 'S/N'}` : '',
        data.bairro || '',
        data.municipio ? `${data.municipio} - ${data.uf}` : '',
        data.cep ? `CEP: ${data.cep}` : ''
      ].filter(Boolean).join(' - ');

      if (fullAddr) setAddress(fullAddr);

      showSuccess(`Dados da empresa '${data.razaoSocial}' preenchidos com sucesso! Situação: ${data.situacaoCadastral}`, 'CNPJ Localizado');
    } catch (err: any) {
      showError(err.message || 'Erro ao consultar CNPJ na base pública.', 'Consulta CNPJ');
    } finally {
      setSearchingCnpj(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    const qSuppliers = query(
      collection(db, 'suppliers'), 
      where('companyId', '==', companyId)
    );
    const unsubSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Supplier))
        .sort((a, b) => a.name.localeCompare(b.name));
      setSuppliers(data);
    }, (err) => {
      console.warn('Erro ao carregar fornecedores:', err);
    });

    const qProducts = query(
      collection(db, 'products'),
      where('companyId', '==', companyId)
    );
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const prods = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(prods);
    }, (err) => {
      console.warn('Erro ao carregar produtos para cotação:', err);
    });

    return () => {
      unsubSuppliers();
      unsubProducts();
    };
  }, [companyId]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setCnpj(supplier.cnpj || '');
      setContactName(supplier.contactName || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setNotes(supplier.notes || '');
    } else {
      setEditingSupplier(null);
      setName('');
      setCnpj('');
      setContactName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showWarning("A razão social do fornecedor é obrigatória.", "Campo Obrigatório");

    setLoading(true);
    try {
      const payload: Partial<Supplier> = {
        name,
        cnpj,
        contactName,
        phone,
        email,
        address,
        notes,
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
        showSuccess(`Fornecedor ${name} atualizado com sucesso!`, "Cadastro Atualizado");
      } else {
        await createSupplier(payload, user!);
        showSuccess(`Fornecedor ${name} cadastrado com sucesso!`, "Fornecedor Criado");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar fornecedor:", err);
      showError("Erro ao salvar fornecedor.", "Erro no Servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, supplierName: string) => {
    if (confirm(`Deseja remover o fornecedor '${supplierName}'?`)) {
      try {
        await deleteSupplier(id);
        showSuccess(`Fornecedor ${supplierName} removido.`, "Exclusão Concluída");
      } catch (err) {
        console.error("Erro ao deletar fornecedor:", err);
        showError("Erro ao remover fornecedor.", "Erro");
      }
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cnpj?.includes(searchTerm) ||
    s.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showWarning('Nenhum fornecedor para exportar.', 'Exportação');
      return;
    }

    const headers = ['Razão Social / Nome', 'CNPJ', 'Contato / Representante', 'Telefone', 'E-mail', 'Endereço', 'Observações'];
    const rows = filtered.map(s => [
      s.name,
      s.cnpj || '',
      s.contactName || '',
      s.phone || '',
      s.email || '',
      s.address || '',
      s.notes || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fornecedores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Lista de fornecedores exportada com sucesso!', 'Exportação CSV');
  };

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Cadastro de Fornecedores</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestão de fornecedores parceiros, contatos comerciais e origem de mercadorias
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="min-h-[44px] px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fornecedor</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Buscar por razão social, CNPJ ou nome do representante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-xs font-bold outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((supplier) => (
          <div key={supplier.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">{supplier.name}</h3>
                  {supplier.cnpj && (
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">CNPJ: {supplier.cnpj}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(supplier)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id, supplier.name)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {supplier.contactName && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contato: {supplier.contactName}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setContactSupplier(supplier)}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Contactar / Cotação (WhatsApp/E-mail)</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Contact Hub Modal */}
      {contactSupplier && (
        <SupplierContactHubModal
          supplier={contactSupplier}
          user={user}
          products={products}
          onClose={() => setContactSupplier(null)}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Razão Social / Nome *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      CNPJ
                    </label>
                    <button
                      type="button"
                      onClick={handleConsultarCnpj}
                      disabled={searchingCnpj}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider disabled:opacity-50 flex items-center gap-1"
                    >
                      {searchingCnpj ? 'Consultando...' : '🔍 Buscar Dados'}
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Representante / Vendedor
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Endereço Comercial
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-blue-500/20"
                >
                  {loading ? 'Salvar...' : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
