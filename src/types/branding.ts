import { PlanTier } from './licensing';

export type PlatformRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'SALES' 
  | 'SUPPORT' 
  | 'BILLING' 
  | 'TECHNICAL';

export interface CompanyBranding {
  companyId: string;
  name: string;
  tradeName?: string;
  corporateReason?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  slogan?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background?: string;
    sidebarBg?: string;
  };
  appearance: {
    sidebarStyle: 'default' | 'compact' | 'floating';
    density: 'comfortable' | 'compact';
    borderRadius: 'small' | 'medium' | 'large' | 'full';
    darkModeDefault?: boolean;
  };
  branding: {
    showPoweredBy: boolean;
    poweredByText: string; // Ex: 'Tecnologia VarejoPro'
    customDomain?: string;
    whiteLabelTier: PlanTier;
  };
  updatedAt?: any;
}

export interface CommercialLead {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  segment: 'MERCADO' | 'MODA' | 'FARMACIA' | 'RESTAURANTE' | 'SERVICOS' | 'OUTROS';
  interestedPlan: PlanTier;
  status: 'NOVO' | 'CONTATO_INICIAL' | 'DEMO_AGENDADA' | 'PROPOSTA_ENVIADA' | 'NEGOCIACAO' | 'FECHADO_GANHO' | 'PERDIDO';
  estimatedValue: number;
  sellerUid?: string;
  sellerName?: string;
  nextFollowUpDate?: string;
  notes?: string;
  tags?: string[];
  createdAt: any;
  updatedAt?: any;
}
