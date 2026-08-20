/**
 * Standard Brazilian Central Bank (BACEN) PIX EMV Payload Generator (BRCode)
 * Generates compliant "Copia e Cola" and QR Code payloads with CRC16-CCITT checksum.
 */

export interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txId?: string;
  description?: string;
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Calculates CRC16-CCITT (0x1021 polynomial, init 0xFFFF) required by Bacen PIX standard
 */
function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Normalizes text to ASCII uppercase without accents for EMV compliance
 */
function normalizeAscii(text: string, maxLength: number): string {
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase();
  return clean.slice(0, maxLength);
}

/**
 * Generates the full PIX Copy and Paste string (BR Code)
 */
export function generatePixPayload(params: PixPayloadParams): string {
  const {
    pixKey,
    merchantName = 'VAREJOPRO',
    merchantCity = 'SAO PAULO',
    amount,
    txId = '***',
    description
  } = params;

  const cleanPixKey = pixKey.trim();
  const cleanMerchantName = normalizeAscii(merchantName || 'VAREJOPRO', 25) || 'VAREJOPRO';
  const cleanMerchantCity = normalizeAscii(merchantCity || 'SAO PAULO', 15) || 'SAO PAULO';
  const cleanTxId = normalizeAscii(txId || '***', 25).replace(/\s+/g, '') || '***';

  // Format 26: Merchant Account Information
  let merchantAccountInfo = formatEmvField('00', 'br.gov.bcb.pix') + formatEmvField('01', cleanPixKey);
  if (description) {
    const cleanDesc = normalizeAscii(description, 40);
    if (cleanDesc) {
      merchantAccountInfo += formatEmvField('02', cleanDesc);
    }
  }

  // Format 62: Additional Data Field Template (TxID)
  const additionalDataField = formatEmvField('05', cleanTxId);

  let rawPayload = '';
  rawPayload += formatEmvField('00', '01'); // Payload Format Indicator
  rawPayload += formatEmvField('26', merchantAccountInfo); // Merchant Account Information
  rawPayload += formatEmvField('52', '0000'); // Merchant Category Code
  rawPayload += formatEmvField('53', '986'); // Transaction Currency (986 = BRL)

  if (amount !== undefined && amount > 0) {
    rawPayload += formatEmvField('54', amount.toFixed(2)); // Transaction Amount
  }

  rawPayload += formatEmvField('58', 'BR'); // Country Code
  rawPayload += formatEmvField('59', cleanMerchantName); // Merchant Name
  rawPayload += formatEmvField('60', cleanMerchantCity); // Merchant City
  rawPayload += formatEmvField('62', additionalDataField); // Additional Data Field
  rawPayload += '6304'; // CRC16 Header

  const crc = calculateCRC16(rawPayload);
  return `${rawPayload}${crc}`;
}
