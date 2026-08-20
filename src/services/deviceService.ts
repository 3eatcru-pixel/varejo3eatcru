import { CompanyDevice, CompanyEntitlements } from '../types/licensing';


const DEVICE_ID_KEY = 'varejopro_device_id';
const DEVICE_NAME_KEY = 'varejopro_device_name';

async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('varejopro_auth_token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(path, {
    ...options,
    headers
  });
}

export class DeviceService {
  /**
   * Retrieves or initializes persistent local hardware/browser device ID
   */
  static getLocalDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      let uuid = '';
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        uuid = crypto.randomUUID();
      } else {
        // Robust fallback for non-secure contexts (HTTP/iframe)
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      deviceId = `dev_${uuid.substring(0, 12)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Retrieves or defaults device name
   */
  static getLocalDeviceName(): string {
    let name = localStorage.getItem(DEVICE_NAME_KEY);
    if (!name) {
      const platform = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Terminal';
      name = `PDV ${platform} (${navigator.platform || 'Web'})`;
      localStorage.setItem(DEVICE_NAME_KEY, name);
    }
    return name;
  }

  static setLocalDeviceName(name: string): void {
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }

  /**
   * Registers current device with backend
   */
  static async registerCurrentDevice(): Promise<{ success: boolean; device: CompanyDevice; activated: boolean }> {
    const deviceId = this.getLocalDeviceId();
    const deviceName = this.getLocalDeviceName();

    const platform = navigator.platform || 'Web';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'TABLET' : 'PDV';

    const res = await authenticatedFetch('/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        deviceName,
        deviceType,
        platform,
        browser: navigator.userAgent.split(' ')[0] || 'Browser'
      })
    });

    const data = await res.json();
    return data;
  }

  /**
   * Fetches all registered devices and quotas for company
   */
  static async listCompanyDevices(): Promise<{ success: boolean; devices: CompanyDevice[]; entitlements: any }> {
    const res = await authenticatedFetch('/api/devices');
    const data = await res.json();
    return data;
  }

  /**
   * Activates device within company plan
   */
  static async activateDevice(deviceId?: string, deviceName?: string): Promise<any> {
    const id = deviceId || this.getLocalDeviceId();
    const name = deviceName || this.getLocalDeviceName();

    const res = await authenticatedFetch('/api/devices/activate', {
      method: 'POST',
      body: JSON.stringify({ deviceId: id, deviceName: name })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao ativar dispositivo.');
    }
    return data;
  }

  /**
   * Releases device slot
   */
  static async releaseDevice(deviceId: string): Promise<any> {
    const res = await authenticatedFetch(`/api/devices/${deviceId}/release`, {
      method: 'POST'
    });
    return await res.json();
  }

  /**
   * Fetches company license & entitlements
   */
  static async getEntitlements(): Promise<{ success: boolean; entitlements: CompanyEntitlements }> {
    const res = await authenticatedFetch('/api/company/entitlements');
    return await res.json();
  }

  /**
   * Starts a 14-day PRO trial
   */
  static async startTrial(): Promise<{ success: boolean; message: string; trialEndsAt: string; entitlements: CompanyEntitlements }> {
    const res = await authenticatedFetch('/api/company/trial/start', {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao iniciar trial.');
    }
    return data;
  }
}
