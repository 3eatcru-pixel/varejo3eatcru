export interface ParsedNfeProduct {
  itemIndex: number;
  cProd: string;
  cEAN: string;
  xProd: string;
  NCM: string;
  CEST?: string;
  CFOP: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  vDesc?: number;
  // Matched status
  matchedProductId?: string;
  matchedProductName?: string;
  isNewProduct?: boolean;
  suggestedSalePrice?: number;
}

export interface ParsedNfeDuplicate {
  nDup: string;
  dVenc: string;
  vDup: number;
}

export interface ParsedNfeData {
  accessKey: string;
  nNF: string;
  serie: string;
  dhEmi: string;
  supplier: {
    cnpj: string;
    xNome: string;
    xFant?: string;
    ie?: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
  };
  totalProductsValue: number;
  totalNfeValue: number;
  items: ParsedNfeProduct[];
  duplicates: ParsedNfeDuplicate[];
}

export function parseNfeXml(xmlString: string): ParsedNfeData {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

  // Check parsing errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Arquivo XML inválido ou corrompido. Não foi possível interpretar o XML da NFe.');
  }

  // Get infNFe
  const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
  if (!infNFe) {
    throw new Error('Tag <infNFe> não encontrada. O arquivo não é um XML de NFe/NFCe padrão SEFAZ.');
  }

  // Access key from Id attribute (e.g. Id="NFe3522...")
  const idAttr = infNFe.getAttribute('Id') || '';
  const accessKey = idAttr.replace(/\D/g, '');

  // 1. Header <ide>
  const ide = xmlDoc.getElementsByTagName('ide')[0];
  const nNF = getTagValue(ide, 'nNF') || 'S/N';
  const serie = getTagValue(ide, 'serie') || '1';
  const dhEmi = getTagValue(ide, 'dhEmi') || getTagValue(ide, 'dEmi') || new Date().toISOString();

  // 2. Emitente <emit>
  const emit = xmlDoc.getElementsByTagName('emit')[0];
  const cnpj = getTagValue(emit, 'CNPJ') || getTagValue(emit, 'CPF') || '';
  const xNome = getTagValue(emit, 'xNome') || 'Fornecedor Desconhecido';
  const xFant = getTagValue(emit, 'xFant') || xNome;
  const ie = getTagValue(emit, 'IE') || '';

  const enderEmit = emit ? emit.getElementsByTagName('enderEmit')[0] : null;
  const xLgr = getTagValue(enderEmit, 'xLgr') || '';
  const nro = getTagValue(enderEmit, 'nro') || '';
  const xBairro = getTagValue(enderEmit, 'xBairro') || '';
  const xMun = getTagValue(enderEmit, 'xMun') || '';
  const uf = getTagValue(enderEmit, 'UF') || '';
  const phone = getTagValue(enderEmit, 'fone') || '';
  const address = [xLgr, nro, xBairro].filter(Boolean).join(', ');

  // 3. Totais <ICMSTot>
  const icmsTot = xmlDoc.getElementsByTagName('ICMSTot')[0];
  const totalProductsValue = parseFloat(getTagValue(icmsTot, 'vProd') || '0') || 0;
  const totalNfeValue = parseFloat(getTagValue(icmsTot, 'vNF') || '0') || totalProductsValue;

  // 4. Detalhes dos Itens <det>
  const detElements = Array.from(xmlDoc.getElementsByTagName('det'));
  const items: ParsedNfeProduct[] = detElements.map((det, index) => {
    const prod = det.getElementsByTagName('prod')[0];
    const cProd = getTagValue(prod, 'cProd') || '';
    const rawEan = getTagValue(prod, 'cEAN') || '';
    const cEAN = (rawEan && rawEan.toUpperCase() !== 'SEM GTIN') ? rawEan : '';
    const xProd = getTagValue(prod, 'xProd') || 'Item ' + (index + 1);
    const ncm = getTagValue(prod, 'NCM') || '';
    const cest = getTagValue(prod, 'CEST') || undefined;
    const cfop = getTagValue(prod, 'CFOP') || '';
    const uCom = (getTagValue(prod, 'uCom') || 'UN').toUpperCase();
    const qCom = parseFloat(getTagValue(prod, 'qCom') || '1') || 1;
    const vUnCom = parseFloat(getTagValue(prod, 'vUnCom') || '0') || 0;
    const vProd = parseFloat(getTagValue(prod, 'vProd') || '0') || (qCom * vUnCom);
    const vDesc = parseFloat(getTagValue(prod, 'vDesc') || '0') || 0;

    return {
      itemIndex: index + 1,
      cProd,
      cEAN,
      xProd,
      NCM: ncm,
      CEST: cest,
      CFOP: cfop,
      uCom,
      qCom,
      vUnCom,
      vProd,
      vDesc,
      suggestedSalePrice: parseFloat((vUnCom * 1.5).toFixed(2)) // Default markup 50%
    };
  });

  // 5. Duplicatas <dup>
  const dupElements = Array.from(xmlDoc.getElementsByTagName('dup'));
  const duplicates: ParsedNfeDuplicate[] = dupElements.map((dup, index) => {
    const nDup = getTagValue(dup, 'nDup') || String(index + 1);
    const dVenc = getTagValue(dup, 'dVenc') || '';
    const vDup = parseFloat(getTagValue(dup, 'vDup') || '0') || 0;
    return { nDup, dVenc, vDup };
  });

  return {
    accessKey,
    nNF,
    serie,
    dhEmi,
    supplier: {
      cnpj,
      xNome,
      xFant,
      ie,
      phone,
      city: xMun,
      state: uf,
      address
    },
    totalProductsValue,
    totalNfeValue,
    items,
    duplicates
  };
}

function getTagValue(parent: Element | null, tagName: string): string | null {
  if (!parent) return null;
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0 && elements[0].textContent) {
    return elements[0].textContent.trim();
  }
  return null;
}
