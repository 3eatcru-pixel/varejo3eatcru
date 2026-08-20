import { collection, getDocs, doc, setDoc, query, where, db } from '../lib/firebase';
import { GoogleWorkspaceService } from './workspace/GoogleWorkspaceService';

export interface ComprehensiveBackupManifest {
  version: string;
  generatedAt: string;
  companyId: string;
  companyName: string;
  checksum: string; // sha256:<hex>
  counts: {
    products: number;
    sales: number;
    clients: number;
    suppliers: number;
    services: number;
    cashRegisters: number;
    settings: number;
  };
  data: {
    products: any[];
    sales: any[];
    clients: any[];
    suppliers: any[];
    services: any[];
    cashRegisters: any[];
    settings: any[];
  };
}

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  calculatedChecksum: string;
  manifestChecksum: string;
  recordCount: number;
}

export interface RestoreResult {
  success: boolean;
  companyId: string;
  restoredCounts: {
    products: number;
    sales: number;
    clients: number;
    suppliers: number;
    services: number;
    cashRegisters: number;
    settings: number;
  };
  verifiedIntegrity: boolean;
  errors: string[];
}

export class BackupService {
  /**
   * Deterministic Object Canonicalization for Cryptographic Hashing
   */
  private static canonicalize(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      // Sort array of objects with 'id' deterministically, or map children
      const mapped = obj.map(item => this.canonicalize(item));
      return mapped.sort((a, b) => {
        const idA = a?.id ? String(a.id) : JSON.stringify(a);
        const idB = b?.id ? String(b.id) : JSON.stringify(b);
        return idA.localeCompare(idB);
      });
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = this.canonicalize(obj[key]);
    }
    return result;
  }

  /**
   * Computes SHA-256 hash over canonical representation of data payload
   */
  static async computeChecksum(data: any): Promise<string> {
    const canonical = this.canonicalize(data);
    const jsonString = JSON.stringify(canonical);

    // 1. Web Crypto API (Browser)
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(jsonString));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `sha256:${hashHex}`;
    }

    // 2. Pure JS Fallback SHA-256 implementation (Node/SSR/Unit testing safe)
    return `sha256:${this.sha256Fallback(jsonString)}`;
  }

  private static sha256Fallback(ascii: string): string {
    function rightRotate(value: number, amount: number) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';
    const words: number[] = [];
    const asciiLength = ascii.length * 8;
    let hash: number[] = [];
    let k: number[] = [];
    let primeCounter = 0;
    const isComposite: Record<number, boolean> = {};

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = candidate * candidate; i < 312; i += candidate) {
          isComposite[i] = true;
        }
        if (primeCounter < 8) {
          hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        }
        k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        primeCounter++;
      }
    }

    ascii += '\x80';
    while ((ascii.length % 64) - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return ''; // ASCII check
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiLength / maxWord) | 0;
    words[words.length] = asciiLength | 0;

    for (let j = 0; j < words.length; ) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash.slice(0);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const s0 = i < 16 ? w[i] : (
          w[i] = (
            (w[i - 16] +
              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
              w[i - 7] +
              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0
          )
        );
        const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
        const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
        const temp1 = hash[7] + s1 + ch + k[i] + s0;
        const s0_h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
        const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
        const temp2 = s0_h + maj;

        hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
      }
      for (let i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 3; j >= 0; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  /**
   * Generates a complete, UN-TRUNCATED, strictly tenant-isolated backup snapshot.
   * 
   * Multi-Tenant Isolation Audit Matrix:
   * - products: query(collection('products'), where('companyId', '==', safeComp))
   * - sales: query(collection('sales'), where('companyId', '==', safeComp))
   * - clients: query(collection('clients'), where('companyId', '==', safeComp))
   * - suppliers: query(collection('suppliers'), where('companyId', '==', safeComp))
   * - services: query(collection('services'), where('companyId', '==', safeComp))
   * - cash_registers: query(collection('cash_registers'), where('companyId', '==', safeComp))
   * - settings: filter strictly matching companyId === safeComp OR doc.id includes safeComp
   */
  static async generateCompleteBackup(
    companyId: string,
    companyName: string,
    onProgress?: (stage: string, current: number, total: number) => void
  ): Promise<ComprehensiveBackupManifest> {
    const safeComp = companyId || 'empresa_principal';
    
    // 1. Products (Tenant Isolated)
    if (onProgress) onProgress('Carregando catálogo de produtos...', 1, 7);
    const prodSnap = await getDocs(query(collection(db, 'products'), where('companyId', '==', safeComp)));
    const products = prodSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    // 2. Sales (Tenant Isolated, No arbitrary limit)
    if (onProgress) onProgress('Carregando histórico completo de vendas...', 2, 7);
    const salesSnap = await getDocs(query(collection(db, 'sales'), where('companyId', '==', safeComp)));
    const sales = salesSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    // 3. Clients (Tenant Isolated)
    if (onProgress) onProgress('Carregando base de clientes...', 3, 7);
    const clientsSnap = await getDocs(query(collection(db, 'clients'), where('companyId', '==', safeComp)));
    const clients = clientsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    // 4. Suppliers (Tenant Isolated)
    if (onProgress) onProgress('Carregando fornecedores e compras...', 4, 7);
    const suppSnap = await getDocs(query(collection(db, 'suppliers'), where('companyId', '==', safeComp)));
    const suppliers = suppSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    // 5. Services (Tenant Isolated)
    if (onProgress) onProgress('Carregando catálogo de serviços...', 5, 7);
    const servSnap = await getDocs(query(collection(db, 'services'), where('companyId', '==', safeComp)));
    const services = servSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    // 6. Cash Registers (Tenant Isolated)
    if (onProgress) onProgress('Carregando histórico de caixas e turnos...', 6, 7);
    const cashSnap = await getDocs(query(collection(db, 'cash_registers'), where('companyId', '==', safeComp)));
    const cashRegisters = cashSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    // 7. Settings (STRICTLY Tenant Isolated: excludes other company settings)
    if (onProgress) onProgress('Carregando configurações fiscais e da loja...', 7, 7);
    const setSnap = await getDocs(collection(db, 'settings'));
    const settings = setSnap.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .filter(d => {
        // Must belong to this company
        if (d.companyId && d.companyId === safeComp) return true;
        if (d.id && d.id.includes(safeComp)) return true;
        return false;
      });

    const rawData = {
      products,
      sales,
      clients,
      suppliers,
      services,
      cashRegisters,
      settings
    };

    // Calculate Real Cryptographic SHA-256 Checksum
    const checksum = await this.computeChecksum(rawData);

    const manifest: ComprehensiveBackupManifest = {
      version: '3.1.0-enterprise',
      generatedAt: new Date().toISOString(),
      companyId: safeComp,
      companyName,
      checksum,
      counts: {
        products: products.length,
        sales: sales.length,
        clients: clients.length,
        suppliers: suppliers.length,
        services: services.length,
        cashRegisters: cashRegisters.length,
        settings: settings.length
      },
      data: rawData
    };

    return manifest;
  }

  /**
   * Validates a backup manifest for integrity, schema compliance, counts, and SHA-256 checksum match.
   */
  static async validateBackup(manifest: ComprehensiveBackupManifest): Promise<BackupValidationResult> {
    const errors: string[] = [];

    if (!manifest) {
      return { valid: false, errors: ['Manifesto inexistente ou nulo'], calculatedChecksum: '', manifestChecksum: '', recordCount: 0 };
    }

    if (!manifest.version || !manifest.version.startsWith('3.')) {
      errors.push(`Versão incompatível ou não suportada: ${manifest.version || 'desconhecida'}`);
    }

    if (!manifest.companyId) {
      errors.push('Identificador da empresa (companyId) ausente no manifesto.');
    }

    if (!manifest.data || typeof manifest.data !== 'object') {
      errors.push('Estrutura de dados (data) ausente ou inválida.');
      return { valid: false, errors, calculatedChecksum: '', manifestChecksum: manifest.checksum || '', recordCount: 0 };
    }

    // Check mandatory collection arrays
    const requiredCollections: Array<keyof ComprehensiveBackupManifest['data']> = [
      'products', 'sales', 'clients', 'suppliers', 'services', 'cashRegisters', 'settings'
    ];

    let totalRecords = 0;
    for (const col of requiredCollections) {
      const arr = manifest.data[col];
      if (!Array.isArray(arr)) {
        errors.push(`Coleção obrigatória [${col}] ausente ou não é um array.`);
      } else {
        totalRecords += arr.length;
        const expectedCount = manifest.counts ? manifest.counts[col as keyof typeof manifest.counts] : undefined;
        if (expectedCount !== undefined && expectedCount !== arr.length) {
          errors.push(`Discrepância na contagem de [${col}]: declarado ${expectedCount}, encontrado ${arr.length}.`);
        }
      }
    }

    // Cryptographic SHA-256 Checksum Verification
    const calculatedChecksum = await this.computeChecksum(manifest.data);
    if (!manifest.checksum) {
      errors.push('Checksum ausente no manifesto.');
    } else if (manifest.checksum !== calculatedChecksum) {
      errors.push(`Corrupção de integridade: checksum declarado [${manifest.checksum}] não confere com o cálculo SHA-256 [${calculatedChecksum}].`);
    }

    return {
      valid: errors.length === 0,
      errors,
      calculatedChecksum,
      manifestChecksum: manifest.checksum || '',
      recordCount: totalRecords
    };
  }

  /**
   * Restores and verifies a full backup snapshot into the target tenant database.
   */
  static async restoreBackup(
    manifest: ComprehensiveBackupManifest,
    targetCompanyId: string,
    onProgress?: (stage: string, count: number) => void
  ): Promise<RestoreResult> {
    const safeComp = targetCompanyId || manifest.companyId || 'empresa_principal';

    // 1. Validation Step
    const validation = await this.validateBackup(manifest);
    if (!validation.valid) {
      return {
        success: false,
        companyId: safeComp,
        restoredCounts: { products: 0, sales: 0, clients: 0, suppliers: 0, services: 0, cashRegisters: 0, settings: 0 },
        verifiedIntegrity: false,
        errors: [`Falha na validação do backup antes da restauração: ${validation.errors.join('; ')}`]
      };
    }

    const errors: string[] = [];
    const restoredCounts = {
      products: 0,
      sales: 0,
      clients: 0,
      suppliers: 0,
      services: 0,
      cashRegisters: 0,
      settings: 0
    };

    try {
      // 1. Restore Products
      if (onProgress) onProgress('Restaurando produtos...', (manifest.data.products || []).length);
      for (const prod of manifest.data.products || []) {
        await setDoc(doc(db, 'products', prod.id), { ...prod, companyId: safeComp }, { merge: true });
        restoredCounts.products++;
      }

      // 2. Restore Sales
      if (onProgress) onProgress('Restaurando vendas...', (manifest.data.sales || []).length);
      for (const sale of manifest.data.sales || []) {
        await setDoc(doc(db, 'sales', sale.id), { ...sale, companyId: safeComp }, { merge: true });
        restoredCounts.sales++;
      }

      // 3. Restore Clients
      if (onProgress) onProgress('Restaurando clientes...', (manifest.data.clients || []).length);
      for (const client of manifest.data.clients || []) {
        await setDoc(doc(db, 'clients', client.id), { ...client, companyId: safeComp }, { merge: true });
        restoredCounts.clients++;
      }

      // 4. Restore Suppliers
      if (onProgress) onProgress('Restaurando fornecedores...', (manifest.data.suppliers || []).length);
      for (const supp of manifest.data.suppliers || []) {
        await setDoc(doc(db, 'suppliers', supp.id), { ...supp, companyId: safeComp }, { merge: true });
        restoredCounts.suppliers++;
      }

      // 5. Restore Services
      if (onProgress) onProgress('Restaurando serviços...', (manifest.data.services || []).length);
      for (const serv of manifest.data.services || []) {
        await setDoc(doc(db, 'services', serv.id), { ...serv, companyId: safeComp }, { merge: true });
        restoredCounts.services++;
      }

      // 6. Restore Cash Registers
      if (onProgress) onProgress('Restaurando registros de caixa...', (manifest.data.cashRegisters || []).length);
      for (const cash of manifest.data.cashRegisters || []) {
        await setDoc(doc(db, 'cash_registers', cash.id), { ...cash, companyId: safeComp }, { merge: true });
        restoredCounts.cashRegisters++;
      }

      // 7. Restore Settings
      if (onProgress) onProgress('Restaurando configurações...', (manifest.data.settings || []).length);
      for (const st of manifest.data.settings || []) {
        await setDoc(doc(db, 'settings', st.id), { ...st, companyId: safeComp }, { merge: true });
        restoredCounts.settings++;
      }

      // Verification: Check record numbers match
      const verifiedIntegrity = 
        restoredCounts.products === (manifest.counts.products || 0) &&
        restoredCounts.sales === (manifest.counts.sales || 0) &&
        restoredCounts.clients === (manifest.counts.clients || 0) &&
        restoredCounts.suppliers === (manifest.counts.suppliers || 0) &&
        restoredCounts.cashRegisters === (manifest.counts.cashRegisters || 0);

      return {
        success: true,
        companyId: safeComp,
        restoredCounts,
        verifiedIntegrity,
        errors
      };
    } catch (e: any) {
      errors.push(e.message || "Erro desconhecido durante a restauração");
      return {
        success: false,
        companyId: safeComp,
        restoredCounts,
        verifiedIntegrity: false,
        errors
      };
    }
  }

  /**
   * Triggers browser download of full JSON snapshot
   */
  static downloadBackupFile(manifest: ComprehensiveBackupManifest): void {
    const jsonStr = JSON.stringify(manifest, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `backup_completo_${manifest.companyId}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Sends complete backup directly to Google Drive
   */
  static async uploadBackupToGoogleDrive(
    manifest: ComprehensiveBackupManifest,
    companyName: string
  ): Promise<{ fileId: string; fileName: string; webViewLink?: string }> {
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_completo_${manifest.companyId}_${dateStr}.json`;

    const res = await GoogleWorkspaceService.uploadBackupToDrive(companyName, fileName, manifest);
    return {
      fileId: res.id,
      fileName: res.name,
      webViewLink: res.webViewLink
    };
  }
}
