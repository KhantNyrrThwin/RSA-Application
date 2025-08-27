export type AgentName = "Alice" | "Bob" | "Eve";

export interface RsaEncryptionKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface RsaSigningKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface AgentKeys {
  name: AgentName;
  encrypt: RsaEncryptionKeys;
  sign: RsaSigningKeys;
}

const RSA_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]); // 65537

export async function generateEncryptionKeyPair(): Promise<RsaEncryptionKeys> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: RSA_PUBLIC_EXPONENT,
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
}

export async function generateSigningKeyPair(): Promise<RsaSigningKeys> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: RSA_PUBLIC_EXPONENT,
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
}

export async function encryptString(
  publicKey: CryptoKey,
  plaintext: string,
): Promise<string> {
  const data = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data);
  return arrayBufferToBase64(encrypted);
}

export async function decryptToString(
  privateKey: CryptoKey,
  base64Ciphertext: string,
): Promise<string> {
  const cipherBytes = base64ToArrayBuffer(base64Ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, cipherBytes);
  return new TextDecoder().decode(decrypted);
}

export async function signString(
  privateKey: CryptoKey,
  data: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    bytes,
  );
  return arrayBufferToBase64(sig);
}

export async function verifySignature(
  publicKey: CryptoKey,
  data: string,
  base64Signature: string,
): Promise<boolean> {
  const bytes = new TextEncoder().encode(data);
  const sigBytes = base64ToArrayBuffer(base64Signature);
  return await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    publicKey,
    sigBytes,
    bytes,
  );
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
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function prettyPrintJwk(jwk: JsonWebKey): string {
  return JSON.stringify(jwk, Object.keys(jwk).sort(), 2);
}

