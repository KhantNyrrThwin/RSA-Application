export interface RsaEncryptionKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface RsaSigningKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

const RSA_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]);

export async function generateEncryptionKeyPair(): Promise<RsaEncryptionKeys> {
  const kp = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: RSA_PUBLIC_EXPONENT,
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

export async function generateSigningKeyPair(): Promise<RsaSigningKeys> {
  const kp = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: RSA_PUBLIC_EXPONENT,
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

export async function signBytes(privateKey: CryptoKey, data: Uint8Array): Promise<string> {
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, privateKey, data);
  return arrayBufferToBase64(sig);
}

export async function verifyBytes(publicKey: CryptoKey, data: Uint8Array, b64sig: string): Promise<boolean> {
  const sig = base64ToArrayBuffer(b64sig);
  return crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, publicKey, sig, data);
}

export async function encryptBytes(publicKey: CryptoKey, data: Uint8Array): Promise<string> {
  const ct = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data);
  return arrayBufferToBase64(ct);
}

export async function decryptBytes(privateKey: CryptoKey, b64: string): Promise<Uint8Array> {
  const buf = base64ToArrayBuffer(b64);
  const pt = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, buf);
  return new Uint8Array(pt);
}

export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return (await crypto.subtle.exportKey("jwk", key)) as JsonWebKey;
}
export async function exportPrivateKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return (await crypto.subtle.exportKey("jwk", key)) as JsonWebKey;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// AES-GCM helpers for hybrid encryption of large files
export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function aesEncrypt(key: CryptoKey, data: Uint8Array): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }>{
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv, ciphertext: ct };
}

export async function aesDecrypt(key: CryptoKey, iv: Uint8Array, ciphertext: ArrayBuffer): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Uint8Array(pt);
}

export async function exportAesKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

export async function importAesKeyRaw(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

