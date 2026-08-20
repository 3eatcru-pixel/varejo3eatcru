/**
 * BrasilAPI & Public Services Integration for ERP/POS
 * Provides instant CNPJ and CEP auto-fill directly from official public sources.
 */

export interface CnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral: string;
  dataInicioAtividade?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  cnaeFiscalDescricao?: string;
}

export interface CepData {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/**
 * Fetches company details by CNPJ with fallback
 */
export async function fetchCnpjDetails(cnpjRaw: string): Promise<CnpjData> {
  const cleanCnpj = cnpjRaw.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) {
    throw new Error('CNPJ deve conter exatamente 14 dígitos numéricos.');
  }

  // Attempt 1: BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (res.ok) {
      const data = await res.json();
      return {
        cnpj: cleanCnpj,
        razaoSocial: data.razao_social || data.nome_fantasia || '',
        nomeFantasia: data.nome_fantasia || '',
        situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
        dataInicioAtividade: data.data_inicio_atividade || '',
        email: data.email || '',
        telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : '',
        logradouro: data.descricao_tipo_de_logradouro ? `${data.descricao_tipo_de_logradouro} ${data.logradouro}` : (data.logradouro || ''),
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
        cnaeFiscalDescricao: data.cnae_fiscal_descricao || ''
      };
    }
  } catch (err) {
    console.warn('Falha ao consultar CNPJ via BrasilAPI, tentando serviço secundário...', err);
  }

  // Attempt 2: Publica CNPJ WS Fallback
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
    if (res.ok) {
      const data = await res.json();
      const est = data.estabelecimento || {};
      return {
        cnpj: cleanCnpj,
        razaoSocial: data.razao_social || '',
        nomeFantasia: est.nome_fantasia || '',
        situacaoCadastral: est.situacao_cadastral || 'ATIVA',
        email: est.email || '',
        telefone: est.ddd1 && est.telefone1 ? `(${est.ddd1}) ${est.telefone1}` : '',
        logradouro: est.logradouro || '',
        numero: est.numero || '',
        bairro: est.bairro || '',
        municipio: est.cidade?.nome || '',
        uf: est.estado?.sigla || '',
        cep: est.cep || ''
      };
    }
  } catch (fallbackErr) {
    console.error('Falha em todos os serviços de consulta CNPJ:', fallbackErr);
  }

  throw new Error('Não foi possível consultar os dados do CNPJ nos serviços públicos.');
}

/**
 * Fetches address by CEP with fallback
 */
export async function fetchAddressByCep(cepRaw: string): Promise<CepData> {
  const cleanCep = cepRaw.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos.');
  }

  // Attempt 1: BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
    if (res.ok) {
      const data = await res.json();
      return {
        cep: cleanCep,
        logradouro: data.street || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        uf: data.state || ''
      };
    }
  } catch (err) {
    console.warn('ViaCEP fallback...');
  }

  // Attempt 2: ViaCEP
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          cep: cleanCep,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || ''
        };
      }
    }
  } catch (viaErr) {
    console.error('Falha na consulta do CEP:', viaErr);
  }

  throw new Error('CEP não localizado.');
}
