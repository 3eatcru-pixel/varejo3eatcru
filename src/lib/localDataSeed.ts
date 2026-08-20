import { Product, Supplier, UserProfile, CompanyRole, CashRegister } from '../types';

export const SEED_USERS: Record<string, UserProfile> = {
  'user_admin_01': {
    uid: 'user_admin_01',
    email: 'audtrilha@gmail.com',
    name: 'Aud Trilha (Super Admin)',
    role: 'admin' as CompanyRole,
    companyId: 'empresa_principal',
    companyName: 'VarejoPro Supermercados & Conveniência',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'seed_3eatcru_gmail_com': {
    uid: 'seed_3eatcru_gmail_com',
    email: '3eatcru@gmail.com',
    name: 'Usuário Teste 1',
    role: 'admin' as CompanyRole,
    companyId: 'empresa_principal',
    companyName: 'VarejoPro Supermercados & Conveniência',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'seed_allanhenrique436_gmail_com': {
    uid: 'seed_allanhenrique436_gmail_com',
    email: 'allanhenrique436@gmail.com',
    name: 'Allan Henrique',
    role: 'admin' as CompanyRole,
    companyId: 'empresa_principal',
    companyName: 'VarejoPro Supermercados & Conveniência',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'user_gerente_02': {
    uid: 'user_gerente_02',
    email: 'gerente@varejopro.com',
    name: 'Carlos Oliveira (Gerente)',
    role: 'gerente' as CompanyRole,
    companyId: 'empresa_principal',
    companyName: 'VarejoPro Supermercados & Conveniência',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  'user_caixa_03': {
    uid: 'user_caixa_03',
    email: 'caixa@varejopro.com',
    name: 'Mariana Souza (Operadora)',
    role: 'caixa' as CompanyRole,
    companyId: 'empresa_principal',
    companyName: 'VarejoPro Supermercados & Conveniência',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

export const SEED_PRODUCTS: any[] = [
  {
    id: 'prod_001',
    code: '7891000100101',
    name: 'Café Torrado e Moído Especial 500g',
    category: 'Mercearia',
    price: 18.90,
    costPrice: 11.50,
    stock: 45,
    minStock: 10,
    unit: 'UN',
    ncm: '0901.21.00',
    cfop: '5102',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_002',
    code: '7891000200202',
    name: 'Azeite de Oliva Extra Virgem 500ml',
    category: 'Mercearia',
    price: 34.50,
    costPrice: 22.00,
    stock: 28,
    minStock: 8,
    unit: 'UN',
    ncm: '1509.10.00',
    cfop: '5102',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_003',
    code: '7891000300303',
    name: 'Refrigerante Guaraná 2L',
    category: 'Bebidas',
    price: 8.99,
    costPrice: 5.20,
    stock: 80,
    minStock: 20,
    unit: 'UN',
    ncm: '2202.10.00',
    cfop: '5102',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_004',
    code: '7891000400404',
    name: 'Cerveja Artesanal IPA 600ml',
    category: 'Bebidas',
    price: 14.50,
    costPrice: 8.50,
    stock: 60,
    minStock: 15,
    unit: 'UN',
    ncm: '2203.00.00',
    cfop: '5102',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_005',
    code: '7891000500505',
    name: 'Arroz Tipo 1 Nobre 5kg',
    category: 'Mercearia',
    price: 26.90,
    costPrice: 19.00,
    stock: 35,
    minStock: 12,
    unit: 'UN',
    ncm: '1006.30.21',
    cfop: '5102',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_006',
    code: '7891000600606',
    name: 'Detergente Líquido Neutro 500ml',
    category: 'Limpeza',
    price: 2.89,
    costPrice: 1.60,
    stock: 120,
    minStock: 30,
    unit: 'UN',
    ncm: '3402.20.00',
    cfop: '5102',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_007',
    code: '7891000700707',
    name: 'Chocolate Amargo 70% Cacau 100g',
    category: 'Doces & Snacks',
    price: 9.50,
    costPrice: 5.40,
    stock: 50,
    minStock: 10,
    unit: 'UN',
    ncm: '1806.32.10',
    cfop: '5102',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SEED_CLIENTS: any[] = [
  {
    id: 'cli_001',
    name: 'Mariana Silva',
    document: '123.456.789-00',
    email: 'mariana.silva@email.com',
    phone: '(11) 98765-4321',
    points: 340,
    totalSpent: 1450.80,
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cli_002',
    name: 'Lucas Ferreira',
    document: '987.654.321-11',
    email: 'lucas.ferreira@email.com',
    phone: '(11) 97654-3210',
    points: 180,
    totalSpent: 820.00,
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cli_003',
    name: 'Juliana Costa',
    document: '456.789.123-22',
    email: 'juliana.costa@email.com',
    phone: '(11) 96543-2109',
    points: 520,
    totalSpent: 2310.50,
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString()
  }
];

export const SEED_SUPPLIERS: any[] = [
  {
    id: 'sup_001',
    corporateName: 'Distribuidora Alimentos do Brasil Ltda',
    tradeName: 'Brasil Alimentos',
    cnpj: '12.345.678/0001-90',
    email: 'comercial@brasilalimentos.com.br',
    phone: '(11) 3456-7890',
    contactName: 'Roberto Sales',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup_002',
    corporateName: 'Bebidas & Refrescos Paulistana S.A.',
    tradeName: 'Paulistana Bebidas',
    cnpj: '98.765.432/0001-10',
    email: 'pedidos@paulistanabebidas.com',
    phone: '(11) 3322-1100',
    contactName: 'Fernanda Lima',
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString()
  }
];

export const SEED_SERVICES: any[] = [
  {
    id: 'serv_001',
    name: 'Atendimento Consultoria & Entrega Expressa',
    description: 'Separação de compras com entrega rápida domiciliar',
    price: 15.00,
    durationMinutes: 30,
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString()
  },
  {
    id: 'serv_002',
    name: 'Corte Especial & Embalagem a Vácuo',
    description: 'Serviço de açougue especializado com embalagem a vácuo',
    price: 10.00,
    durationMinutes: 20,
    companyId: 'empresa_principal',
    createdAt: new Date().toISOString()
  }
];

export const SEED_COMPANY = {
  id: 'empresa_principal',
  name: 'VarejoPro Supermercados & Conveniência',
  tradeName: 'VarejoPro Express',
  document: '12.345.678/0001-90',
  email: 'contato@varejopro.com.br',
  phone: '(11) 3456-7890',
  address: 'Av. Paulista, 1000 - São Paulo, SP',
  plan: 'PRO',
  status: 'ACTIVE',
  createdAt: new Date().toISOString()
};

export const SEED_STORE_SETTINGS = {
  companyName: 'VarejoPro Supermercados & Conveniência',
  tradeName: 'VarejoPro Express',
  document: '12.345.678/0001-90',
  email: 'contato@varejopro.com.br',
  phone: '(11) 3456-7890',
  address: 'Av. Paulista, 1000 - São Paulo, SP',
  currency: 'BRL',
  taxRegime: 'Simples Nacional',
  primaryColor: '#10b981',
  logoUrl: '',
  updatedAt: new Date().toISOString()
};
