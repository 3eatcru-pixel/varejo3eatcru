export type PlanTier = 'FREE' | 'TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export type SubscriptionStatus = 
  | 'FREE' 
  | 'TRIAL' 
  | 'ACTIVE' 
  | 'PAST_DUE' 
  | 'SUSPENDED' 
  | 'EXPIRED' 
  | 'CANCELED';

export interface PlanLimits {
  users: number;       // Assentos de usuários permitidos
  devices: number;     // Dispositivos PDV / terminais ativos
  branches: number;    // Quantidade de filiais
  products: number;    // Limite de catálogo de produtos
  clients: number;     // Limite de clientes cadastrados
  pulseQRCodes: number;// Limite de pontos de atendimento Pulse
}

export interface PlanFeatures {
  pos: boolean;
  stock: boolean;
  financial: boolean;
  employees: boolean;      // Convidar outros operadores/funcionários
  multiTerminal: boolean;  // Ativar múltiplos PDVs simultâneos
  fiscal: boolean;         // Emissão de NFC-e / NF-e
  offlineSync: boolean;    // Sincronização offline em nuvem
  workspace: boolean;      // Integração Google Workspace / Drive
  aiAssistant: boolean;    // Consultor e assistente executivo IA
  whiteLabel: boolean;     // Personalização visual avançada da marca
  prioritySupport: boolean;// Atendimento com SLA prioritário
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  badge: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: PlanFeatures;
  isPopular?: boolean;
}

export interface CompanyDevice {
  id: string;              // Identificador único (UUID ou companyId_deviceId)
  deviceId: string;        // ID do hardware / navegador
  companyId: string;
  branchId: string;
  branchName?: string;
  deviceName: string;      // Ex: "PDV Balcão 01", "Tablet Estoque"
  deviceType: 'PDV' | 'TABLET' | 'MOBILE' | 'DESKTOP';
  platform?: string;       // Ex: "Windows", "Android", "macOS", "Linux"
  browser?: string;        // Ex: "Chrome 120", "Safari 17"
  ipAddress?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  activatedAt: string;
  lastSeenAt: string;
  activatedByUid?: string;
  activatedByName?: string;
}

export interface CompanyEntitlements {
  companyId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  subscriptionExpiresAt?: string;
  limits: PlanLimits;
  features: PlanFeatures;
  usage: {
    users: number;
    devices: number;
    branches: number;
    products: number;
    clients: number;
    pulseQRCodes: number;
  };
}

export const PLATFORM_PLANS: Record<PlanTier, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Gratuito / Teste',
    badge: 'Grátis',
    description: 'Experimente o VarejoPro no seu comércio com 1 usuário e 1 dispositivo.',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      users: 1,
      devices: 1,
      branches: 1,
      products: 50,
      clients: 50,
      pulseQRCodes: 5
    },
    features: {
      pos: true,
      stock: true,
      financial: true,
      employees: false,
      multiTerminal: false,
      fiscal: false,
      offlineSync: true,
      workspace: false,
      aiAssistant: false,
      whiteLabel: false,
      prioritySupport: false
    }
  },
  TRIAL: {
    id: 'TRIAL',
    name: 'Trial PRO (14 dias)',
    badge: 'Degustação',
    description: 'Experimentação completa de todas as funcionalidades profissionais.',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      users: 5,
      devices: 3,
      branches: 2,
      products: 2000,
      clients: 2000,
      pulseQRCodes: 50
    },
    features: {
      pos: true,
      stock: true,
      financial: true,
      employees: true,
      multiTerminal: true,
      fiscal: true,
      offlineSync: true,
      workspace: true,
      aiAssistant: true,
      whiteLabel: false,
      prioritySupport: true
    }
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    badge: 'Inicial',
    description: 'Para comércios individuais que precisam de equipe pequena e controle fiscal básico.',
    priceMonthly: 79,
    priceYearly: 790,
    limits: {
      users: 3,
      devices: 2,
      branches: 1,
      products: 1000,
      clients: 1000,
      pulseQRCodes: 15
    },
    features: {
      pos: true,
      stock: true,
      financial: true,
      employees: true,
      multiTerminal: true,
      fiscal: true,
      offlineSync: true,
      workspace: false,
      aiAssistant: false,
      whiteLabel: false,
      prioritySupport: false
    }
  },
  PRO: {
    id: 'PRO',
    name: 'Profissional',
    badge: 'Mais Escolhido',
    description: 'Para lojas estruturadas com equipe completa, multi-terminais e backup no Drive.',
    priceMonthly: 149,
    priceYearly: 1490,
    isPopular: true,
    limits: {
      users: 10,
      devices: 5,
      branches: 2,
      products: 5000,
      clients: 5000,
      pulseQRCodes: 30
    },
    features: {
      pos: true,
      stock: true,
      financial: true,
      employees: true,
      multiTerminal: true,
      fiscal: true,
      offlineSync: true,
      workspace: true,
      aiAssistant: false,
      whiteLabel: false,
      prioritySupport: true
    }
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Business',
    badge: 'Completo',
    description: 'Para redes de lojas, franquias e operações de alto fluxo com inteligência artificial.',
    priceMonthly: 299,
    priceYearly: 2990,
    limits: {
      users: 25,
      devices: 15,
      branches: 5,
      products: 20000,
      clients: 20000,
      pulseQRCodes: 100
    },
    features: {
      pos: true,
      stock: true,
      financial: true,
      employees: true,
      multiTerminal: true,
      fiscal: true,
      offlineSync: true,
      workspace: true,
      aiAssistant: true,
      whiteLabel: true,
      prioritySupport: true
    }
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise / Custom',
    badge: 'Corporativo',
    description: 'Solução sob medida com limites customizados e suporte dedicado 24/7.',
    priceMonthly: 599,
    priceYearly: 5990,
    limits: {
      users: 999,
      devices: 999,
      branches: 99,
      products: 100000,
      clients: 100000,
      pulseQRCodes: 999
    },
    features: {
      pos: true,
      stock: true,
      financial: true,
      employees: true,
      multiTerminal: true,
      fiscal: true,
      offlineSync: true,
      workspace: true,
      aiAssistant: true,
      whiteLabel: true,
      prioritySupport: true
    }
  }
};
