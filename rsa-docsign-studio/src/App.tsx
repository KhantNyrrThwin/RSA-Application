import { useEffect, useState } from 'react'
import './index.css'
import { Button } from './components/ui/button'
import { UploadArea } from './components/UploadArea'
import { Timeline, type DocEvent } from './components/Timeline'
import {
  generateEncryptionKeyPair,
  generateSigningKeyPair,
  signBytes,
  verifyBytes,
  encryptBytes,
  decryptBytes,
  exportPublicKeyJwk,
  exportPrivateKeyJwk,
} from './utils/rsa'
import { KeyViewer } from './components/KeyViewer'

function App() {
  const [encKeys, setEncKeys] = useState<{ publicKey: CryptoKey, privateKey: CryptoKey } | null>(null)
  const [sigKeys, setSigKeys] = useState<{ publicKey: CryptoKey, privateKey: CryptoKey } | null>(null)
  const [events, setEvents] = useState<DocEvent[]>([])
  const [showKeys, setShowKeys] = useState(false)
  const [encryptToSelf, setEncryptToSelf] = useState(true)
  const [tamper, setTamper] = useState(false)
  const [pubJwk, setPubJwk] = useState<JsonWebKey | undefined>(undefined)
  const [privJwk, setPrivJwk] = useState<JsonWebKey | undefined>(undefined)

  useEffect(() => {
    const init = async () => {
      const [e, s] = await Promise.all([generateEncryptionKeyPair(), generateSigningKeyPair()])
      setEncKeys(e)
      setSigKeys(s)
      setPubJwk(await exportPublicKeyJwk(e.publicKey))
      setPrivJwk(await exportPrivateKeyJwk(e.privateKey))
    }
    init()
  }, [])

  const onFile = async (file: File) => {
    if (!encKeys || !sigKeys) return
    const bytes = new Uint8Array(await file.arrayBuffer())
    // Compute SHA-256 (hex), then sign the SHA string bytes so verify uses the same input
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const shaHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
    const signature = await signBytes(sigKeys.privateKey, new TextEncoder().encode(shaHex))
    let ciphertext: string | undefined
    if (encryptToSelf) {
      ciphertext = await encryptBytes(encKeys.publicKey, bytes)
      if (tamper && ciphertext.length > 8) {
        ciphertext = ciphertext.slice(0, -8) + 'AAAAAAA='
      }
    }
    const evt: DocEvent = {
      id: crypto.randomUUID(),
      filename: file.name,
      size: file.size,
      sha256: shaHex,
      signature,
      ciphertext,
      createdAt: Date.now(),
    }
    setEvents((prev) => [evt, ...prev])
  }

  const onVerify = async (id: string) => {
    if (!sigKeys) return
    const current = [...events]
    const idx = current.findIndex((e) => e.id === id)
    if (idx === -1) return
    const e = current[idx]
    try {
      // Verify over the SHA-256 hex string bytes, matching what we sign
      const shaBytes = new TextEncoder().encode(e.sha256)
      const ok = await verifyBytes(sigKeys.publicKey, shaBytes, e.signature || '')
      current[idx] = { ...e, authentic: ok }
    } catch {
      current[idx] = { ...e, authentic: false }
    }
    setEvents(current)
  }

  const onDecrypt = async (id: string) => {
    if (!encKeys) return
    const current = [...events]
    const idx = current.findIndex((e) => e.id === id)
    if (idx === -1) return
    const e = current[idx]
    if (!e.ciphertext) return
    try {
      await decryptBytes(encKeys.privateKey, e.ciphertext)
      current[idx] = { ...e, decryptedOk: true }
    } catch {
      current[idx] = { ...e, decryptedOk: false, tampered: true }
    }
    setEvents(current)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🔏 RSA DocSign Studio</h1>
          <div className="flex items-center gap-3 text-sm">
            <label className="opacity-80 flex items-center gap-2">
              <input type="checkbox" checked={encryptToSelf} onChange={(e) => setEncryptToSelf(e.target.checked)} />
              Encrypt to my public key
            </label>
            <label className="opacity-80 flex items-center gap-2">
              <input type="checkbox" checked={tamper} onChange={(e) => setTamper(e.target.checked)} />
              Tamper ciphertext
            </label>
            <Button variant="outline" onClick={() => setShowKeys((s) => !s)}>{showKeys ? 'Hide Keys' : 'Show Keys'}</Button>
          </div>
        </div>

        <UploadArea onFile={onFile} disabled={!encKeys || !sigKeys} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Timeline events={events} onVerify={onVerify} onDecrypt={encryptToSelf ? onDecrypt : undefined} />
          </div>
          <div className="space-y-4">
            {showKeys && (
              <KeyViewer title="My RSA Encryption Keys" publicJwk={pubJwk} privateJwk={privJwk} />
            )}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="font-semibold mb-2">How it works</div>
              <ol className="list-decimal pl-5 text-sm space-y-1 opacity-90">
                <li>Generate RSA encryption and signing keys</li>
                <li>Upload a file → we compute SHA-256</li>
                <li>Sign file bytes with your private signing key</li>
                <li>Optionally encrypt file to your public key</li>
                <li>Verify signature and test decryption</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
