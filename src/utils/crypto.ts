import CryptoJS from 'crypto-js';

const CANARY_TOKEN = 'MENOTES_ENCRYPTED_V1';

interface EncryptedPayload {
  canary: string;
  content: string;
  timestamp: number;
}

/**
 * Encrypt note content using AES-256 with a verification canary token.
 */
export function encryptNoteContent(plainText: string, pin: string): string {
  if (!pin || pin.trim().length === 0) {
    throw new Error('PIN/Password tidak boleh kosong.');
  }

  const payload: EncryptedPayload = {
    canary: CANARY_TOKEN,
    content: plainText,
    timestamp: Date.now(),
  };

  const serialized = JSON.stringify(payload);
  const ciphertext = CryptoJS.AES.encrypt(serialized, pin.trim()).toString();
  return ciphertext;
}

/**
 * Decrypt note content using AES-256 and verify canary token integrity.
 * Throws an error if the PIN is incorrect or decryption fails.
 */
export function decryptNoteContent(cipherText: string, pin: string): string {
  if (!pin || pin.trim().length === 0) {
    throw new Error('PIN/Password tidak boleh kosong.');
  }

  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, pin.trim());
    const decryptedRaw = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedRaw) {
      throw new Error('PIN atau Password salah.');
    }

    const payload: EncryptedPayload = JSON.parse(decryptedRaw);

    if (payload.canary !== CANARY_TOKEN) {
      throw new Error('PIN atau Password salah.');
    }

    return payload.content;
  } catch (err: any) {
    if (err.message === 'PIN atau Password salah.') {
      throw err;
    }
    throw new Error('PIN atau Password salah.');
  }
}

/**
 * Check if the content is likely an AES encrypted ciphertext.
 */
export function isNoteEncrypted(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  // CryptoJS AES ciphertext with OpenSSL salt starts with "U2FsdGVkX1" in base64
  return content.startsWith('U2FsdGVkX1') || (content.length > 32 && !content.includes('<') && !content.includes(' '));
}

