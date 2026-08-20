import { Sale, Product, FiscalData } from '../../types';

interface Emitente {
  cnpj: string;
  xNome: string;
  xFant: string;
  IE: string;
  CRT: string;
  endereco: {
    xLgr: string;
    nro: string;
    xCpl?: string;
    xBairro: string;
    cMun: string;
    xMun: string;
    UF: string;
    CEP: string;
  };
}

// Utilitário para formatar datas no padrão SEFAZ: AAAA-MM-DDThh:mm:ssTZD
const formatDateSefaz = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const padTz = (n: number) => Math.floor(Math.abs(n)).toString().padStart(2, '0');
  
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    diff + padTz(tzOffset / 60) +
    ':' + padTz(tzOffset % 60);
};

export class XmlGeneratorService {
  /**
   * Constrói o XML base da NFC-e (Modelo 65) a partir de uma Venda
   */
  static generateNfceXml(
    sale: Sale,
    emitente: Emitente,
    nNFCe: number,
    serie: number,
    naturezaOperacao: string = 'VENDA DE MERCADORIA',
    ambient: '1' | '2' = '2' // 1: Produção, 2: Homologação
  ): string {
    const versao = "4.00";
    // Chave de Acesso fictícia de 44 digitos para o nó Id (Apenas demonstração)
    const chaveAcesso = `41${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${emitente.cnpj.replace(/\D/g, '')}65${serie.toString().padStart(3, '0')}${nNFCe.toString().padStart(9, '0')}1${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    
    // Calcula o dígito verificador módulo 11 (fictício, substituído por 9)
    const chaveComDv = `${chaveAcesso}9`;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<enviNFe versao="${versao}" xmlns="http://www.portalfiscal.inf.br/nfe">\n`;
    xml += `  <idLote>1</idLote>\n`;
    xml += `  <indSinc>1</indSinc>\n`;
    xml += `  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">\n`;
    xml += `    <infNFe versao="${versao}" Id="NFe${chaveComDv}">\n`;
    
    // 1. Identificação (ide)
    xml += `      <ide>\n`;
    xml += `        <cUF>41</cUF>\n`; // Fixo PR para exemplo
    xml += `        <cNF>${chaveAcesso.slice(-8)}</cNF>\n`;
    xml += `        <natOp>${naturezaOperacao}</natOp>\n`;
    xml += `        <mod>65</mod>\n`;
    xml += `        <serie>${serie}</serie>\n`;
    xml += `        <nNF>${nNFCe}</nNF>\n`;
    xml += `        <dhEmi>${formatDateSefaz(new Date(sale.createdAt))}</dhEmi>\n`;
    xml += `        <tpNF>1</tpNF>\n`; // 1=Saída
    xml += `        <idDest>1</idDest>\n`; // 1=Operação interna
    xml += `        <cMunFG>${emitente.endereco.cMun}</cMunFG>\n`;
    xml += `        <tpImp>4</tpImp>\n`; // 4=DANFE NFC-e
    xml += `        <tpEmis>1</tpEmis>\n`; // 1=Normal
    xml += `        <cDV>9</cDV>\n`;
    xml += `        <tpAmb>${ambient}</tpAmb>\n`;
    xml += `        <finNFe>1</finNFe>\n`; // 1=Normal
    xml += `        <indFinal>1</indFinal>\n`; // 1=Consumidor Final
    xml += `        <indPres>1</indPres>\n`; // 1=Operação presencial
    xml += `        <procEmi>0</procEmi>\n`; // 0=Aplicativo do Contribuinte
    xml += `        <verProc>VarejoPro 1.0.0</verProc>\n`;
    xml += `      </ide>\n`;

    // 2. Emitente (emit)
    xml += `      <emit>\n`;
    xml += `        <CNPJ>${emitente.cnpj.replace(/\D/g, '')}</CNPJ>\n`;
    xml += `        <xNome>${emitente.xNome}</xNome>\n`;
    xml += `        <xFant>${emitente.xFant}</xFant>\n`;
    xml += `        <enderEmit>\n`;
    xml += `          <xLgr>${emitente.endereco.xLgr}</xLgr>\n`;
    xml += `          <nro>${emitente.endereco.nro}</nro>\n`;
    if (emitente.endereco.xCpl) xml += `          <xCpl>${emitente.endereco.xCpl}</xCpl>\n`;
    xml += `          <xBairro>${emitente.endereco.xBairro}</xBairro>\n`;
    xml += `          <cMun>${emitente.endereco.cMun}</cMun>\n`;
    xml += `          <xMun>${emitente.endereco.xMun}</xMun>\n`;
    xml += `          <UF>${emitente.endereco.UF}</UF>\n`;
    xml += `          <CEP>${emitente.endereco.CEP.replace(/\D/g, '')}</CEP>\n`;
    xml += `          <cPais>1058</cPais>\n`;
    xml += `          <xPais>Brasil</xPais>\n`;
    xml += `        </enderEmit>\n`;
    xml += `        <IE>${emitente.IE.replace(/\D/g, '')}</IE>\n`;
    xml += `        <CRT>${emitente.CRT}</CRT>\n`; // 1=Simples, 3=Normal
    xml += `      </emit>\n`;

    // 3. Destinatário (dest) Opcional na NFC-e
    if (sale.customerCpf) {
      xml += `      <dest>\n`;
      xml += `        <CPF>${sale.customerCpf.replace(/\D/g, '')}</CPF>\n`;
      if (sale.customerName) xml += `        <xNome>${sale.customerName}</xNome>\n`;
      xml += `        <indIEDest>9</indIEDest>\n`; // 9=Não Contribuinte
      xml += `      </dest>\n`;
    }

    // 4. Detalhamento dos Produtos (det)
    sale.items.forEach((item, index) => {
      xml += `      <det nItem="${index + 1}">\n`;
      xml += `        <prod>\n`;
      xml += `          <cProd>${item.productId}</cProd>\n`;
      xml += `          <cEAN>SEM GTIN</cEAN>\n`;
      xml += `          <xProd>${item.productName}</xProd>\n`;
      // Valores mockados quando não existir (em produção deve vir do cache do produto)
      xml += `          <NCM>00000000</NCM>\n`; 
      xml += `          <CFOP>5102</CFOP>\n`;
      xml += `          <uCom>UN</uCom>\n`;
      xml += `          <qCom>${item.quantity.toFixed(4)}</qCom>\n`;
      xml += `          <vUnCom>${item.price.toFixed(4)}</vUnCom>\n`;
      xml += `          <vProd>${item.total.toFixed(2)}</vProd>\n`;
      xml += `          <cEANTrib>SEM GTIN</cEANTrib>\n`;
      xml += `          <uTrib>UN</uTrib>\n`;
      xml += `          <qTrib>${item.quantity.toFixed(4)}</qTrib>\n`;
      xml += `          <vUnTrib>${item.price.toFixed(4)}</vUnTrib>\n`;
      xml += `          <indTot>1</indTot>\n`;
      xml += `        </prod>\n`;
      
      // Impostos (Imposto) - Mock Simples Nacional para Exemplo
      xml += `        <imposto>\n`;
      xml += `          <ICMS>\n`;
      xml += `            <ICMSSN102>\n`;
      xml += `              <orig>0</orig>\n`;
      xml += `              <CSOSN>102</CSOSN>\n`;
      xml += `            </ICMSSN102>\n`;
      xml += `          </ICMS>\n`;
      xml += `          <PIS>\n`;
      xml += `            <PISOutr>\n`;
      xml += `              <CST>99</CST>\n`;
      xml += `              <vPIS>0.00</vPIS>\n`;
      xml += `            </PISOutr>\n`;
      xml += `          </PIS>\n`;
      xml += `          <COFINS>\n`;
      xml += `            <COFINSOutr>\n`;
      xml += `              <CST>99</CST>\n`;
      xml += `              <vCOFINS>0.00</vCOFINS>\n`;
      xml += `            </COFINSOutr>\n`;
      xml += `          </COFINS>\n`;
      xml += `        </imposto>\n`;
      xml += `      </det>\n`;
    });

    // 5. Total (total)
    xml += `      <total>\n`;
    xml += `        <ICMSTot>\n`;
    xml += `          <vBC>0.00</vBC>\n`;
    xml += `          <vICMS>0.00</vICMS>\n`;
    xml += `          <vICMSDeson>0.00</vICMSDeson>\n`;
    xml += `          <vFCP>0.00</vFCP>\n`;
    xml += `          <vBCST>0.00</vBCST>\n`;
    xml += `          <vST>0.00</vST>\n`;
    xml += `          <vFCPST>0.00</vFCPST>\n`;
    xml += `          <vFCPSTRet>0.00</vFCPSTRet>\n`;
    xml += `          <vProd>${sale.subtotal.toFixed(2)}</vProd>\n`;
    xml += `          <vFrete>0.00</vFrete>\n`;
    xml += `          <vSeg>0.00</vSeg>\n`;
    xml += `          <vDesc>${sale.discount.toFixed(2)}</vDesc>\n`;
    xml += `          <vII>0.00</vII>\n`;
    xml += `          <vIPI>0.00</vIPI>\n`;
    xml += `          <vIPIDevol>0.00</vIPIDevol>\n`;
    xml += `          <vPIS>0.00</vPIS>\n`;
    xml += `          <vCOFINS>0.00</vCOFINS>\n`;
    xml += `          <vOutro>0.00</vOutro>\n`;
    xml += `          <vNF>${sale.total.toFixed(2)}</vNF>\n`;
    xml += `        </ICMSTot>\n`;
    xml += `      </total>\n`;

    // 6. Pagamento (pag)
    xml += `      <pag>\n`;
    xml += `        <detPag>\n`;
    
    // Mapeia PaymentMethod para Sefaz (01=Dinheiro, 03=Cartão Credito, 04=Cartão Debito, 17=PIX)
    let tPag = '01'; // Default Dinheiro
    if (sale.paymentMethod === 'PIX') tPag = '17';
    if (sale.paymentMethod === 'CREDIT_CARD') tPag = '03';
    if (sale.paymentMethod === 'DEBIT_CARD') tPag = '04';

    xml += `          <tPag>${tPag}</tPag>\n`;
    xml += `          <vPag>${sale.total.toFixed(2)}</vPag>\n`;
    xml += `        </detPag>\n`;
    xml += `      </pag>\n`;

    // Fechamento
    xml += `    </infNFe>\n`;
    xml += `  </NFe>\n`;
    xml += `</enviNFe>\n`;

    return xml;
  }
}