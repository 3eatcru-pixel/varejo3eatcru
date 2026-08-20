import { 
  UserProfile, 
  Product, 
  Sale, 
  CashRegister, 
  FinancialRecord, 
  FiscalDocument 
} from '@varejopro/types';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export class VarejoProApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(config?: { baseUrl?: string; getToken?: () => string | null }) {
    this.baseUrl = config?.baseUrl || '';
    this.getToken = config?.getToken || (() => {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('varejopro_auth_token');
      }
      return null;
    });
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {})
    };

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new ApiError(errorMsg, res.status, data);
    }

    return data as T;
  }

  // Health
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request('/api/health');
  }

  // Auth
  auth = {
    login: async (credentials: { email: string; password?: string; pin?: string }) => {
      return this.request<{ success: boolean; token: string; profile: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    },
    register: async (userData: Partial<UserProfile> & { password?: string }) => {
      return this.request<{ success: boolean; token: string; profile: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    getProfile: async () => {
      return this.request<{ success: boolean; profile: UserProfile }>('/api/auth/me');
    }
  };

  // Sales
  sales = {
    create: async (salePayload: any) => {
      return this.request<{ success: boolean; sale: Sale; message?: string }>('/api/sales', {
        method: 'POST',
        body: JSON.stringify(salePayload)
      });
    },
    list: async (params?: { limit?: number; startDate?: string; endDate?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request<{ sales: Sale[] }>(`/api/sales${q ? '?' + q : ''}`);
    },
    cancel: async (saleId: string, reason: string) => {
      return this.request<{ success: boolean; sale: Sale }>(`/api/sales/${saleId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    }
  };

  // Cash Register
  cashRegister = {
    getCurrent: async (terminalId?: string) => {
      const q = terminalId ? `?terminalId=${encodeURIComponent(terminalId)}` : '';
      return this.request<{ register: CashRegister | null }>(`/api/cash-register/current${q}`);
    },
    open: async (data: { initialBalance: number; branchId?: string; terminalId?: string }) => {
      return this.request<{ success: boolean; register: CashRegister }>('/api/cash-register/open', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    close: async (data: { registerId: string; declaredBalances?: any; notes?: string }) => {
      return this.request<{ success: boolean; register: CashRegister }>('/api/cash-register/close', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    addOperation: async (data: { registerId: string; type: 'SANGRIA' | 'SUPRIMENTO'; amount: number; reason: string }) => {
      return this.request<{ success: boolean; register: CashRegister }>('/api/cash-register/operation', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  };

  // Stock
  stock = {
    list: async (category?: string) => {
      const q = category ? `?category=${encodeURIComponent(category)}` : '';
      return this.request<{ products: Product[] }>(`/api/stock/products${q}`);
    },
    save: async (product: Partial<Product>) => {
      return this.request<{ success: boolean; product: Product }>('/api/stock/products', {
        method: 'POST',
        body: JSON.stringify(product)
      });
    },
    move: async (movementData: { productId: string; delta: number; type: string; reason: string }) => {
      return this.request<{ success: boolean }>('/api/stock/movement', {
        method: 'POST',
        body: JSON.stringify(movementData)
      });
    }
  };

  // Finance
  finance = {
    list: async (type?: 'RECEIVABLE' | 'PAYABLE') => {
      const q = type ? `?type=${type}` : '';
      return this.request<{ records: FinancialRecord[] }>(`/api/finance/records${q}`);
    },
    create: async (record: Partial<FinancialRecord>) => {
      return this.request<{ success: boolean; record: FinancialRecord }>('/api/finance/records', {
        method: 'POST',
        body: JSON.stringify(record)
      });
    },
    updateStatus: async (recordId: string, status: string, paymentDate?: string) => {
      return this.request<{ success: boolean }>(`/api/finance/records/${recordId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, paymentDate })
      });
    }
  };

  // Fiscal
  fiscal = {
    issueNfce: async (saleId: string) => {
      return this.request<{ success: boolean; document: FiscalDocument }>('/api/fiscal/nfce', {
        method: 'POST',
        body: JSON.stringify({ saleId })
      });
    }
  };

  // HQ Management
  hq = {
    getOverview: async () => {
      return this.request<{ success: boolean; stats: any }>('/api/hq/overview');
    },
    listTenants: async () => {
      return this.request<{ success: boolean; tenants: any[] }>('/api/hq/tenants');
    }
  };

  // Devices & Terminals
  devices = {
    list: async () => {
      return this.request<{ success: boolean; devices: any[] }>('/api/devices');
    },
    pair: async (pairingCode: string, deviceInfo: any) => {
      return this.request<{ success: boolean; device: any }>('/api/devices/pair', {
        method: 'POST',
        body: JSON.stringify({ pairingCode, deviceInfo })
      });
    }
  };
}

export const api = new VarejoProApiClient();
