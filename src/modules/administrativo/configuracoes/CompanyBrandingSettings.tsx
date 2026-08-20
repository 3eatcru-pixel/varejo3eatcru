import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Palette, 
  Image, 
  Upload, 
  CheckCircle2, 
  Save, 
  Loader2, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  Layers, 
  Smartphone,
  Globe,
  Sliders
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { CompanyBranding } from '../../../types/branding';
import { useCompany } from '../../../contexts/CompanyContext';
import { useToast } from '../../../components/Toast';
import { storage } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function CompanyBrandingSettings({ user }: { user?: UserProfile }) {
  const { branding, saveBranding } = useCompany();
  const { showSuccess, showError } = useToast();

  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [corporateReason, setCorporateReason] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [slogan, setSlogan] = useState('');
  
  // Visuals
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDarkUrl, setLogoDarkUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  
  // Colors
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#34d399');
  const [sidebarBg, setSidebarBg] = useState('#020617');

  // Appearance & White-label
  const [sidebarStyle, setSidebarStyle] = useState<'default' | 'compact' | 'floating'>('default');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [borderRadius, setBorderRadius] = useState<'small' | 'medium' | 'large' | 'full'>('large');
  const [showPoweredBy, setShowPoweredBy] = useState(true);
  const [poweredByText, setPoweredByText] = useState('Tecnologia 3eatcru • VarejoPro');

  useEffect(() => {
    if (branding) {
      setName(branding.name || '');
      setTradeName(branding.tradeName || '');
      setCorporateReason(branding.corporateReason || '');
      setCnpj(branding.cnpj || '');
      setPhone(branding.phone || '');
      setEmail(branding.email || '');
      setAddress(branding.address || '');
      setSlogan(branding.slogan || '');

      setLogoUrl(branding.logoUrl || '');
      setLogoDarkUrl(branding.logoDarkUrl || '');
      setFaviconUrl(branding.faviconUrl || '');

      if (branding.colors) {
        setPrimaryColor(branding.colors.primary || '#10b981');
        setSecondaryColor(branding.colors.secondary || '#0f172a');
        setAccentColor(branding.colors.accent || '#34d399');
        setSidebarBg(branding.colors.sidebarBg || '#020617');
      }

      if (branding.appearance) {
        setSidebarStyle(branding.appearance.sidebarStyle || 'default');
        setDensity(branding.appearance.density || 'comfortable');
        setBorderRadius(branding.appearance.borderRadius || 'large');
      }

      if (branding.branding) {
        setShowPoweredBy(branding.branding.showPoweredBy ?? true);
        setPoweredByText(branding.branding.poweredByText || 'Tecnologia 3eatcru • VarejoPro');
      }
    }
  }, [branding]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'logoDark' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('O arquivo deve ter no máximo 2MB.', 'Imagem Muito Grande');
      return;
    }

    // Set loading state if you want, using Toast for now
    showSuccess('Processando imagem...', 'Aguarde');

    // Optimize and scale image via canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = target === 'favicon' ? 64 : 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob and upload to Firebase Storage
          canvas.toBlob(async (blob) => {
            if (!blob) {
              showError('Erro ao processar imagem.');
              return;
            }

            try {
              const companyId = branding?.companyId || user?.companyId || 'default';
              const fileExt = file.name.split('.').pop() || 'png';
              const fileName = `branding/${companyId}/${target}_${Date.now()}.${fileExt}`;
              const storageRef = ref(storage, fileName);
              
              const uploadTask = await uploadBytesResumable(storageRef, blob, {
                contentType: file.type || 'image/png'
              });

              const downloadUrl = await getDownloadURL(uploadTask.ref);

              if (target === 'logo') setLogoUrl(downloadUrl);
              if (target === 'logoDark') setLogoDarkUrl(downloadUrl);
              if (target === 'favicon') setFaviconUrl(downloadUrl);
              showSuccess('Imagem enviada e otimizada com sucesso. Clique em Salvar para aplicar.', 'Upload Concluído');
            } catch (err: any) {
              console.error("Storage upload error:", err);
              showError(err.message || 'Erro ao enviar imagem.');
            }
          }, 'image/png', 0.85);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Server / Subscription dictates whiteLabelTier; client preserves assigned entitlement tier
      const activeTier = branding?.branding?.whiteLabelTier || 'FREE';

      await saveBranding({
        name: name || 'Minha Loja',
        tradeName: tradeName || name,
        corporateReason,
        cnpj,
        phone,
        email,
        address,
        slogan,
        logoUrl,
        logoDarkUrl,
        faviconUrl,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          sidebarBg
        },
        appearance: {
          sidebarStyle,
          density,
          borderRadius
        },
        branding: {
          showPoweredBy,
          poweredByText: poweredByText || 'Tecnologia VarejoPro',
          whiteLabelTier: activeTier
        }
      });
      showSuccess('Identidade visual da empresa salva e aplicada com sucesso!', 'Marca Atualizada');
    } catch (err) {
      console.error(err);
      showError('Falha ao salvar identidade visual da empresa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="space-y-1">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider">
            White-Label & Personalização de Marca
          </span>
          <h2 className="text-xl font-black uppercase tracking-wider flex items-center gap-2 text-white">
            <Palette className="w-6 h-6 text-emerald-400" />
            <span>Identidade Visual da Empresa</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-xl">
            Configure logotipo, cores e formato de exibição. Todo o sistema e comprovantes adotarão a marca da sua empresa automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Save className="w-4 h-4 text-slate-950" />}
            <span>{saving ? 'Salvando...' : 'Salvar Identidade'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Left (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Dados Comerciais */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>1. Informações e Nome da Loja</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome Comercial / Nome do App</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Mercado Silva / Moda Chic"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Razão Social (Opcional)</label>
                <input
                  type="text"
                  value={corporateReason}
                  onChange={e => setCorporateReason(e.target.value)}
                  placeholder="Ex: Mercado Silva Comércio de Alimentos LTDA"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CNPJ / CPF</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Slogan / Frase do Cupom</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={e => setSlogan(e.target.value)}
                  placeholder="Ex: Qualidade e o melhor preço para você"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Endereço Comercial</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Logotipos & Ícones */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Image className="w-4 h-4 text-emerald-600" />
              <span>2. Logotipos & Favicon</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Logo Principal */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                  Logotipo Principal (PNG/JPG)
                </label>
                {logoUrl && (
                  <div className="h-16 w-full flex items-center justify-center bg-white rounded-xl border p-2">
                    <img src={logoUrl} alt="Logo Principal" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileUpload(e, 'logo')}
                  className="w-full text-[10px] text-slate-500 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white"
                />
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="Ou URL do logotipo..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] outline-none"
                />
              </div>

              {/* Logo Fundo Escuro */}
              <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-3">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                  Logo para Fundo Escuro
                </label>
                {logoDarkUrl ? (
                  <div className="h-16 w-full flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800 p-2">
                    <img src={logoDarkUrl} alt="Logo Dark" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-16 w-full flex items-center justify-center bg-slate-900 rounded-xl border border-dashed border-slate-800 text-[10px] text-slate-500">
                    Opcional (Usa Logo Principal)
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileUpload(e, 'logoDark')}
                  className="w-full text-[10px] text-slate-400 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-800 file:text-white"
                />
                <input
                  type="url"
                  value={logoDarkUrl}
                  onChange={e => setLogoDarkUrl(e.target.value)}
                  placeholder="Ou URL do logo escuro..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-white outline-none"
                />
              </div>

              {/* Favicon */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                  Favicon da Aba (32x32 / ICO)
                </label>
                {faviconUrl ? (
                  <div className="h-16 w-full flex items-center justify-center bg-white rounded-xl border p-2">
                    <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                  </div>
                ) : (
                  <div className="h-16 w-full flex items-center justify-center bg-white rounded-xl border border-dashed text-[10px] text-slate-400">
                    Padrão do Sistema
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileUpload(e, 'favicon')}
                  className="w-full text-[10px] text-slate-500 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-900 file:text-white"
                />
                <input
                  type="url"
                  value={faviconUrl}
                  onChange={e => setFaviconUrl(e.target.value)}
                  placeholder="Ou URL do favicon..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Paleta de Cores */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Palette className="w-4 h-4 text-emerald-600" />
              <span>3. Paleta de Cores da Marca</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                  Cor Primária / Destaque
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                  Cor de Acento / Botões
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Powered By e White-Label */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>4. Identificação & White-Label</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Exibir Assinatura de Tecnologia</h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Exibe sutilmente no rodapé a menção da tecnologia (ex: "Tecnologia 3eatcru • VarejoPro").
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPoweredBy}
                    onChange={e => setShowPoweredBy(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {showPoweredBy && (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Texto da Assinatura</label>
                  <input
                    type="text"
                    value={poweredByText}
                    onChange={e => setPoweredByText(e.target.value)}
                    placeholder="Ex: Tecnologia 3eatcru • VarejoPro"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 rounded-3xl p-6 text-white border border-slate-800 shadow-2xl space-y-6 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Prévia ao Vivo do Sistema</span>
              </h3>
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                CLIENTE
              </span>
            </div>

            {/* Sidebar Mockup Preview */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menu Lateral / Cabeçalho
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-white p-1" />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-md"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-black text-xs uppercase tracking-wider text-white truncate">
                    {name || 'Nome da Empresa'}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate">
                    {slogan || 'PDV & Gestão Integrada'}
                  </p>
                </div>
              </div>

              {/* Navigation Items Mockup */}
              <div className="space-y-1.5 pt-2">
                <div 
                  className="p-2.5 rounded-xl text-xs font-bold flex items-center justify-between text-slate-950"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>📊 Início / Dashboard</span>
                  <span className="text-[9px] font-mono font-black uppercase">Ativo</span>
                </div>
                <div className="p-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800">
                  🛒 Frente de Caixa (PDV)
                </div>
                <div className="p-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800">
                  📦 Estoque & Produtos
                </div>
                <div className="p-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800">
                  💳 Financeiro & Caixa
                </div>
              </div>

              {/* Powered By Footer Preview */}
              {showPoweredBy && (
                <div className="pt-3 border-t border-slate-800 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {poweredByText}
                  </p>
                </div>
              )}
            </div>

            {/* Receipt Preview */}
            <div className="bg-white text-slate-900 rounded-2xl p-4 font-mono text-[10px] space-y-1 border border-slate-200">
              <p className="font-black text-xs uppercase text-center">{name || 'NOME DA EMPRESA'}</p>
              <p className="text-center text-slate-500">{cnpj || '00.000.000/0001-00'}</p>
              <p className="text-center text-slate-500">{address || 'Endereço Comercial'}</p>
              <div className="border-t border-dashed border-slate-300 my-2" />
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>R$ 189,90</span>
              </div>
              <p className="text-center text-[8px] text-slate-400 pt-1">
                {slogan || 'Obrigado pela preferência!'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Save className="w-4 h-4 text-slate-950" />}
              <span>{saving ? 'Aplicando Marca...' : 'Salvar e Aplicar Identidade'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
