/**
 * aiCrypto.ts — E2EE Zero-Knowledge cho LovelyYellowCat AI
 * Dùng Web Crypto API (AES-GCM 256 + PBKDF2 SHA-256) — chạy được cả trên
 * trình duyệt và Cloudflare Workers (via uncrypto polyfill nếu cần).
 * 
 * Luồng khóa:
 *   passphrase (user) --PBKDF2(salt,250k)--> KEK --AES-GCM(wrap)--> encryptedMasterKey (lưu Supabase)
 *   masterKey (random 256-bit) --AES-GCM(iv)--> ciphertext (lưu Supabase)
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

// --- Base64 helpers (an toàn cho ArrayBuffer) ---
export function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- KEK derivation ---
export async function deriveKEK(passphrase: string, salt: Uint8Array, iterations = 250_000): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// --- Master key ---
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportMasterKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

export async function importMasterKeyRaw(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// Wrap / unwrap masterKey bằng KEK
export async function wrapMasterKey(masterKey: CryptoKey, kek: CryptoKey): Promise<{ encryptedMasterKey: string; ivWrap: string }> {
  const raw = await exportMasterKeyRaw(masterKey);
  const ivWrap = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivWrap as BufferSource }, kek, raw);
  return { encryptedMasterKey: toBase64(encrypted), ivWrap: toBase64(ivWrap) };
}

export async function unwrapMasterKey(
  encryptedMasterKeyB64: string,
  ivWrapB64: string,
  kek: CryptoKey
): Promise<CryptoKey> {
  const ivWrap = fromBase64(ivWrapB64);
  const encrypted = fromBase64(encryptedMasterKeyB64);
  const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivWrap as unknown as BufferSource }, kek, encrypted as unknown as BufferSource);
  return importMasterKeyRaw(raw);
}

// --- Encrypt / Decrypt JSON payload (cho title, message content) ---
export interface EncryptedPayload {
  iv: string; // Base64 12B
  ciphertext: string; // Base64
}

export async function encryptJson(obj: unknown, masterKey: CryptoKey): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, masterKey, plaintext);
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

export async function decryptJson<T = unknown>(payload: EncryptedPayload, masterKey: CryptoKey): Promise<T> {
  const iv = fromBase64(payload.iv);
  const ct = fromBase64(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, masterKey, ct as unknown as BufferSource);
  return JSON.parse(dec.decode(plaintext)) as T;
}

// Helper cho string thuần (title)
export async function encryptString(text: string, masterKey: CryptoKey): Promise<EncryptedPayload> {
  return encryptJson({ t: text }, masterKey);
}
export async function decryptString(payload: EncryptedPayload, masterKey: CryptoKey): Promise<string> {
  const obj = await decryptJson<{ t: string }>(payload, masterKey);
  return obj.t;
}

// Kiểm tra passphrase hợp lệ (tối thiểu 8 ký tự)
export function isPassphraseStrong(passphrase: string): boolean {
  return passphrase.trim().length >= 8;
}

// Tạo salt ngẫu nhiên
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
