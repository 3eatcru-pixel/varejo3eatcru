import React, { useState, useEffect } from 'react';
import { UserProfile, CompanyRole, TaxRegime, StoreSettings } from '../../../types';
import { Store, Sliders, Database, Sparkles, CheckCircle2, Loader2, AlertCircle, Building2, Layers, Save, Image, Palette, Phone, Mail, Upload, CreditCard, Compass } from 'lucide-react';
import InventorySettingsSection from './InventorySettingsSection';
import BranchTerminalSection from './BranchTerminalSection';
import OperationalProfileSettings from './OperationalProfileSettings';
import { collection, getDocs, addDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { logAuditEvent } from '../../../lib/auditLogger';
import { useToast } from '../../../components/Toast';

export default function Settings({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'operational' | 'branches' | 'inventory' | 'billing'>('general');
  const [billingPlans, setBillingPlans] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchBillingPlans();
    }
  }, [activeTab]);

  const fetchBillingPlans = async () => {
    setLoadingBilling(true);
    try {
      const snap = await getDocs(collection(db, 'platform_plans'));
      if (!snap.empty) {
        setBillingPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        // Fallback default plans
        setBillingPlans([
          { id: 'STARTER', name: 'Starter', priceMonthly: 79, priceYearly: 790, maxTerminals: 2 },
          { id: 'PRO', name: 'Profissional', priceMonthly: 149, priceYearly: 1490, maxTerminals: 5 },
          { id: 'BUSINESS', name: 'Business', priceMonthly: 299, priceYearly: 2990, maxTerminals: 15 },
          { id: 'ENTERPRISE', name: 'Enterprise', priceMonthly: 599, priceYearly: 5990, maxTerminals: 99 }
        ]);
      }
    } catch (e) {
      setBillingPlans([
        { id: 'STARTER', name: 'Starter', priceMonthly: 79, priceYearly: 790, maxTerminals: 2 },
        { id: 'PRO', name: 'Profissional', priceMonthly: 149, priceYearly: 1490, maxTerminals: 5 },
        { id: 'BUSINESS', name: 'Business', priceMonthly: 299, priceYearly: 2990, maxTerminals: 15 },
        { id: 'ENTERPRISE', name: 'Enterprise', priceMonthly: 599, priceYearly: 5990, maxTerminals: 99 }
      ]);
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleSubscribe = async (planId: string, gateway: 'stripe' | 'mercadopago') => {
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: 'monthly', gateway })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        showError(data.error || 'Erro ao iniciar checkout.');
      }
    } catch (err: any) {
      showError('Erro de conexão ao criar checkout de pagamento.');
    }
  };
  const [storeName, setStoreName] = useState('VarejoPro - Loja Principal');
  const [cnpj, setCnpj] = useState('12.345.678/0001-90');
  const [address, setAddress] = useState('Av. Paulista, 1000 - São Paulo, SP');
  const [phone, setPhone] = useState('(11) 98765-4321');
  const [email, setEmail] = useState('contato@minhaempresa.com.br');
  const [logoUrl, setLogoUrl] = useState('');
  const [slogan, setSlogan] = useState('O melhor atendimento e qualidade para você');
  const [primaryColor, setPrimaryColor] = useState('#10b981'); // Emerald default
  const [savingStore, setSavingStore] = useState(false);

  useEffect(() => {
    if (!user.companyId) return;
    const unsub = onSnapshot(doc(db, 'settings', `store_${user.companyId}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        if (data.storeName) setStoreName(data.storeName);
        if (data.cnpj) setCnpj(data.cnpj);
        if (data.address) setAddress(data.address);
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.slogan) setSlogan(data.slogan);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
      }
    }, (err) => {
      console.warn('Erro ao carregar configurações da loja:', err);
    });
    return () => unsub();
  }, [user.companyId]);

  const handleSaveStore = async () => {
    if (!user.companyId) return;
    setSavingStore(true);
    try {
      await setDoc(doc(db, 'settings', `store_${user.companyId}`), {
        storeName,
        cnpj,
        address,
        phone,
        email,
        logoUrl,
        slogan,
        primaryColor,
        companyId: user.companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showSuccess('Identidade visual e dados da empresa atualizados com sucesso!', 'Marca Atualizada');
    } catch (error) {
      console.error(error);
      showError('Falha ao salvar dados da loja.');
    } finally {
      setSavingStore(false);
    }
  };

  // Image upload simulation or direct URL/Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('A imagem do logotipo deve ter no máximo 2MB.', 'Arquivo Muito Grande');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        showSuccess('Logotipo carregado na prévia. Clique em Salvar para aplicar.', 'Logo Carregado');
      };
      reader.readAsDataURL(file);
    }
  };

  // Seed State
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleSeedDemoData = async () => {
    if (!confirm('Deseja carregar o catálogo de dados demonstrativos do VarejoPro (produtos, clientes, fornecedores e categorias)?')) {
      return;
    }

    setSeeding(true);
    setSeedSuccess(null);
    setSeedError(null);

    try {
      const companyId = user.companyId || '';
      const nowIso = new Date().toISOString();

      // 1. Initial settings
      await setDoc(doc(db, 'settings', `inventory_${companyId}`), {
        categories: ['Vestuário', 'Calçados', 'Perfumaria & Cosméticos', 'Acessórios', 'Esportivo'],
        sectors: ['Vitrine Principal', 'Depósito Central', 'Estoque Superior', 'Balcão de Atendimento'],
        tags: ['Novidade', 'Mais Vendido', 'Promoção', 'Coleção Inverno', 'Importado', 'Alta Durabilidade'],
        companyId
      }, { merge: true });

      // 2. Sample Suppliers
      const supp1 = await addDoc(collection(db, 'suppliers'), {
        name: 'Confecções Brasil Têxtil Ltda',
        cnpj: '45.123.789/0001-12',
        contactName: 'Carlos Mendonça',
        phone: '(11) 98765-4321',
        email: 'vendas@brasiltextil.com.br',
        address: 'Brás, São Paulo - SP',
        companyId,
        createdAt: nowIso
      });

      const supp2 = await addDoc(collection(db, 'suppliers'), {
        name: 'Distribuidora Elegance Cosméticos S/A',
        cnpj: '33.987.654/0001-55',
        contactName: 'Mariana Duarte',
        phone: '(21) 97654-3210',
        email: 'contato@elegancecosmeticos.com.br',
        address: 'Centro, Rio de Janeiro - RJ',
        companyId,
        createdAt: nowIso
      });

      // 3. Sample Clients
      const clientsData = [
        {
          name: 'Ana Beatriz Souza',
          cpfCnpj: '123.456.789-00',
          phone: '(11) 98888-1111',
          whatsapp: '11988881111',
          email: 'anabeatriz@gmail.com',
          birthdate: '1995-08-14',
          pointsBalance: 650,
          totalSpent: 1450.00,
          purchaseCount: 4,
          tier: 'PRATA',
          companyId,
          createdAt: nowIso
        },
        {
          name: 'Rodrigo Augusto Silva',
          cpfCnpj: '321.654.987-11',
          phone: '(11) 97777-2222',
          whatsapp: '11977772222',
          email: 'rodrigo.silva@outlook.com',
          birthdate: '1988-11-20',
          pointsBalance: 1800,
          totalSpent: 3900.00,
          purchaseCount: 9,
          tier: 'OURO',
          companyId,
          createdAt: nowIso
        },
        {
          name: 'Camila Fernandes Lima',
          cpfCnpj: '987.654.321-22',
          phone: '(11) 96666-3333',
          whatsapp: '11966663333',
          email: 'camila.lima@gmail.com',
          birthdate: '1992-05-10',
          pointsBalance: 3200,
          totalSpent: 7200.00,
          purchaseCount: 14,
          tier: 'VIP',
          companyId,
          createdAt: nowIso
        }
      ];

      for (const cl of clientsData) {
        await addDoc(collection(db, 'clients'), cl);
      }

      // 4. Sample Products
      const sampleProducts = [
        {
          name: 'Camiseta Algodão Pima Premium',
          barcode: '7891234560011',
          sku: 'VEST-001',
          price: 119.90,
          costPrice: 45.00,
          stock: 48,
          minStock: 10,
          maxStock: 100,
          unit: 'UN',
          category: 'Vestuário',
          sector: 'Vitrine Principal',
          brand: 'VarejoPro Basics',
          supplierId: supp1.id,
          supplierName: 'Confecções Brasil Têxtil Ltda',
          location: 'Depósito Central',
          tags: ['Novidade', 'Mais Vendido'],
          imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
          fiscalData: {
            ncm: '6109.10.00',
            cest: '28.038.00',
            cfop: '5102',
            origin: '0',
            csosnCst: '102',
            icmsPercent: 18,
            pisPercent: 0.65,
            cofinsPercent: 3.0
          },
          variations: [
            { id: 'v1', name: 'Tamanho P / Preto', size: 'P', color: 'Preto', stock: 12, barcode: '7891234560012' },
            { id: 'v2', name: 'Tamanho M / Preto', size: 'M', color: 'Preto', stock: 18, barcode: '7891234560013' },
            { id: 'v3', name: 'Tamanho G / Branco', size: 'G', color: 'Branco', stock: 18, barcode: '7891234560014' }
          ],
          companyId,
          updatedAt: nowIso
        },
        {
          name: 'Tênis Esportivo Air Runner Pro',
          barcode: '7891234560028',
          sku: 'CALC-002',
          price: 349.90,
          costPrice: 160.00,
          stock: 24,
          minStock: 5,
          maxStock: 50,
          unit: 'PAR',
          category: 'Calçados',
          sector: 'Vitrine Principal',
          brand: 'AeroSport',
          supplierId: supp1.id,
          supplierName: 'Confecções Brasil Têxtil Ltda',
          location: 'Depósito Central',
          tags: ['Esportivo', 'Mais Vendido'],
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60',
          fiscalData: {
            ncm: '6404.11.00',
            cest: '28.040.00',
            cfop: '5102',
            origin: '0',
            csosnCst: '102',
            icmsPercent: 18,
            pisPercent: 0.65,
            cofinsPercent: 3.0
          },
          variations: [
            { id: 'v4', name: '39 / Vermelho', size: '39', color: 'Vermelho', stock: 8, barcode: '7891234560029' },
            { id: 'v5', name: '41 / Vermelho', size: '41', color: 'Vermelho', stock: 10, barcode: '7891234560030' },
            { id: 'v6', name: '42 / Vermelho', size: '42', color: 'Vermelho', stock: 6, barcode: '7891234560031' }
          ],
          companyId,
          updatedAt: nowIso
        },
        {
          name: 'Perfume Eau de Parfum Floratta 100ml',
          barcode: '7891234560045',
          sku: 'COSM-003',
          price: 189.00,
          costPrice: 85.00,
          stock: 35,
          minStock: 8,
          maxStock: 60,
          unit: 'UN',
          category: 'Perfumaria & Cosméticos',
          sector: 'Balcão de Atendimento',
          brand: 'Floratta',
          supplierId: supp2.id,
          supplierName: 'Distribuidora Elegance Cosméticos S/A',
          location: 'Vitrine Principal',
          tags: ['Promoção', 'Importado'],
          imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500&auto=format&fit=crop&q=60',
          fiscalData: {
            ncm: '3303.00.10',
            cest: '20.001.00',
            cfop: '5102',
            origin: '1',
            csosnCst: '102',
            icmsPercent: 25,
            pisPercent: 1.65,
            cofinsPercent: 7.6
          },
          perfumeData: {
            brand: 'Floratta',
            volumeMl: 100,
            gender: 'Feminino',
            origin: 'Importado'
          },
          companyId,
          updatedAt: nowIso
        },
        {
          name: 'Calça Jeans Slim Fit Stretch',
          barcode: '7891234560052',
          sku: 'VEST-004',
          price: 199.90,
          costPrice: 80.00,
          stock: 30,
          minStock: 6,
          maxStock: 70,
          unit: 'UN',
          category: 'Vestuário',
          sector: 'Vitrine Principal',
          brand: 'Denim Co',
          supplierId: supp1.id,
          supplierName: 'Confecções Brasil Têxtil Ltda',
          location: 'Depósito Central',
          tags: ['Coleção Inverno'],
          imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=60',
          fiscalData: {
            ncm: '6203.42.00',
            cest: '28.038.00',
            cfop: '5102',
            origin: '0',
            csosnCst: '102',
            icmsPercent: 18,
            pisPercent: 0.65,
            cofinsPercent: 3.0
          },
          companyId,
          updatedAt: nowIso
        },
        {
          name: 'Óculos de Sol Polarizado UV400',
          barcode: '7891234560069',
          sku: 'ACES-005',
          price: 149.00,
          costPrice: 50.00,
          stock: 20,
          minStock: 4,
          maxStock: 40,
          unit: 'UN',
          category: 'Acessórios',
          sector: 'Balcão de Atendimento',
          brand: 'SunVision',
          supplierId: supp2.id,
          supplierName: 'Distribuidora Elegance Cosméticos S/A',
          location: 'Vitrine Principal',
          tags: ['Alta Durabilidade'],
          imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=60',
          fiscalData: {
            ncm: '9004.10.00',
            cfop: '5102',
            origin: '1',
            csosnCst: '102',
            icmsPercent: 18,
            pisPercent: 0.65,
            cofinsPercent: 3.0
          },
          companyId,
          updatedAt: nowIso
        }
      ];

      for (const prod of sampleProducts) {
        await addDoc(collection(db, 'products'), prod);
      }

      await logAuditEvent({
        userId: user.uid,
        userName: user.name,
        action: 'CARGA_DEMO',
        module: 'CONFIGURACOES',
        companyId,
        details: 'Carga completa de catálogo e base de dados demonstrativos realizada com sucesso.'
      });

      setSeedSuccess('Catálogo de dados demonstrativos carregado com sucesso! Produtos, categorias, clientes e fornecedores prontos para venda no PDV.');
    } catch (err: any) {
      console.error('Erro na carga demonstrativa:', err);
      setSeedError(err.message || 'Erro ao carregar dados demonstrativos.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-500" />
            Configurações do Sistema VarejoPro
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Parâmetros do estabelecimento, catálogo demonstrativo e opções mestre de estoque
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'general'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Geral & Dados Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('operational')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'operational'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Perfil Operacional & Módulos</span>
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'branches'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Filiais & Terminais PDV</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'inventory'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Catálogo, Setores & Tags</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'billing'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Planos & Faturamento SaaS</span>
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Demo Seed Card */}
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-6 rounded-3xl text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
                  <Sparkles className="w-4 h-4" />
                  <span>Ambiente & Demonstração</span>
                </div>
                <h3 className="text-base font-black text-white">
                  Carga Rápida de Catálogo Demonstrativo
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Gere instantaneamente produtos de exemplo com fotos (vestuário, calçados, perfumaria e acessórios), fornecedores parceiros, clientes e categorias para testar o PDV e os relatórios.
                </p>

                {seedSuccess && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{seedSuccess}</span>
                  </div>
                )}

                {seedError && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{seedError}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSeedDemoData}
                disabled={seeding}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Carregando Dados...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Carregar Dados de Exemplo</span>
                  </>
                )}
              </button>
            </div>

            {/* Store Profile & White-Label Branding Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-emerald-500" />
                    Identidade Visual & Dados da Empresa
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Personalize o nome, logotipo e as cores do sistema para exibir a marca da sua empresa em todo o app e nos comprovantes.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
                  Personalização Ativa
                </span>
              </div>

              {/* Logo & Branding Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form: Inputs (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome Fantasia da Empresa</label>
                      <input 
                        type="text" 
                        value={storeName} 
                        onChange={e => setStoreName(e.target.value)}
                        placeholder="Ex: Boutique Elegance / Mercado Central"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Slogan / Frase de Impacto</label>
                      <input 
                        type="text" 
                        value={slogan} 
                        onChange={e => setSlogan(e.target.value)}
                        placeholder="Ex: Moda & Estilo para Você"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CNPJ</label>
                      <input 
                        type="text" 
                        value={cnpj} 
                        onChange={e => setCnpj(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp / Telefone</label>
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail Comercial</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        placeholder="contato@empresa.com.br"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Endereço Comercial Completo</label>
                    <input 
                      type="text" 
                      value={address} 
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Logo URL & File Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        Upload do Logotipo (PNG / JPG)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Image className="w-3.5 h-3.5 text-emerald-600" />
                        Ou Link Direto da Imagem (URL)
                      </label>
                      <input 
                        type="url" 
                        value={logoUrl} 
                        onChange={e => setLogoUrl(e.target.value)}
                        placeholder="https://exemplo.com/logo.png"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Primary Color Palette */}
                  <div className="pt-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Palette className="w-3.5 h-3.5 text-emerald-600" />
                      Cor de Destaque da Marca
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { color: '#10b981', name: 'Esmeralda (Padrão)' },
                        { color: '#3b82f6', name: 'Azul Real' },
                        { color: '#8b5cf6', name: 'Roxo Moderno' },
                        { color: '#f59e0b', name: 'Âmbar / Dourado' },
                        { color: '#ef4444', name: 'Vermelho Ruby' },
                        { color: '#06b6d4', name: 'Ciano Vibrante' },
                        { color: '#0f172a', name: 'Dark Slate' },
                        { color: '#ec4899', name: 'Rosa Fashion' }
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setPrimaryColor(c.color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                            primaryColor === c.color ? 'border-slate-950 scale-110 shadow-md ring-2 ring-offset-2 ring-emerald-400' : 'border-white opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.name}
                        />
                      ))}
                      <div className="flex items-center gap-2 ml-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={e => setPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                          title="Personalizar cor hexadecimal"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700">{primaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Live Preview Box (4 cols) */}
                <div className="lg:col-span-4 bg-slate-950 rounded-2xl p-5 text-white flex flex-col justify-between border border-slate-800 shadow-inner">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Pré-Visualização do Header
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        AO VIVO
                      </span>
                    </div>

                    {/* App Header Preview */}
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-3">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo Loja" 
                          className="w-11 h-11 object-contain rounded-xl bg-white p-1 border border-slate-700 shadow-sm shrink-0" 
                        />
                      ) : (
                        <div 
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-md shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Store className="w-6 h-6" />
                        </div>
                      )}

                      <div className="overflow-hidden">
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-100 truncate">
                          {storeName || 'Sua Empresa'}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          {slogan || 'PDV & Gestão Integrada'}
                        </p>
                      </div>
                    </div>

                    {/* Receipt Header Mini Preview */}
                    <div className="p-3 bg-white text-slate-900 rounded-xl border border-slate-200 text-center space-y-1 font-mono text-[10px]">
                      <p className="font-black text-xs uppercase text-slate-950">{storeName || 'SUA EMPRESA'}</p>
                      <p className="text-[9px] text-slate-500">CNPJ: {cnpj || '00.000.000/0001-00'}</p>
                      <p className="text-[9px] text-slate-500">{address || 'Endereço Comercial'}</p>
                      <p className="text-[9px] text-slate-500">TEL: {phone || '-'}</p>
                      <div className="border-t border-dashed border-slate-300 pt-1 text-[8px] text-slate-400">
                        CUPOM DIGITAL / NÃO FISCAL
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800">
                    <button
                      onClick={handleSaveStore}
                      disabled={savingStore}
                      className="w-full py-3 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {savingStore ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <Save className="w-4 h-4 text-slate-950" />
                      )}
                      <span>{savingStore ? 'Salvando...' : 'Salvar e Aplicar Identidade'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operational' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <OperationalProfileSettings user={user} />
          </div>
        )}

        {activeTab === 'branches' && (
          <BranchTerminalSection user={user} />
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <InventorySettingsSection user={user} />
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Planos & Faturamento SaaS</h3>
                <p className="text-xs text-slate-500">Escolha ou atualize o plano da sua empresa para desbloquear recursos avançados.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold uppercase">
                  Status: Ativo / Teste
                </span>
              </div>
            </div>

            {loadingBilling ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {billingPlans.map((plan) => (
                  <div key={plan.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:border-emerald-500 transition-all">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-emerald-600 tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg">
                          {plan.id}
                        </span>
                        <span className="text-xs font-mono text-slate-500">Até {plan.maxTerminals || 5} Terminais</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900">{plan.name || plan.id}</h4>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">R$ {plan.priceMonthly || 99}</span>
                          <span className="text-xs text-slate-500">/mês</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">
                        Inclui suporte prioritário, PDV offline resiliente, emissão de NFC-e e atualizações em tempo real.
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-200 space-y-2 mt-6">
                      <button
                        onClick={() => handleSubscribe(plan.id, 'mercadopago')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" /> Assinar via Mercado Pago
                      </button>
                      <button
                        onClick={() => handleSubscribe(plan.id, 'stripe')}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" /> Assinar via Stripe
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
