import { useEffect, useState } from 'react'
import './index.css'
import { AgentCard } from './components/AgentCard'
import { ChatWindow, type ChatMessage } from './components/ChatWindow'
import { Button } from './components/ui/button'
import type { AgentKeys } from './utils/rsa'
import {
  generateEncryptionKeyPair,
  generateSigningKeyPair,
  encryptString,
  decryptToString,
  signString,
  verifySignature,
  exportPublicKeyJwk,
  exportPrivateKeyJwk,
} from './utils/rsa'
import { KeyViewer } from './components/KeyViewer'

function App() {
  const [alice, setAlice] = useState<AgentKeys | null>(null)
  const [bob, setBob] = useState<AgentKeys | null>(null)
  const [_eve, _setEve] = useState<AgentKeys | null>(null)
  const [showKeys, setShowKeys] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [tamper, setTamper] = useState(false)
  const [gameMode, setGameMode] = useState(false)
  const [aliceEncPubJwk, setAliceEncPubJwk] = useState<JsonWebKey | undefined>(undefined)
  const [aliceEncPrivJwk, setAliceEncPrivJwk] = useState<JsonWebKey | undefined>(undefined)
  const [bobEncPubJwk, setBobEncPubJwk] = useState<JsonWebKey | undefined>(undefined)
  const [bobEncPrivJwk, setBobEncPrivJwk] = useState<JsonWebKey | undefined>(undefined)

  useEffect(() => {
    const init = async () => {
      const [aEnc, aSig, bEnc, bSig, eEnc, eSig] = await Promise.all([
        generateEncryptionKeyPair(),
        generateSigningKeyPair(),
        generateEncryptionKeyPair(),
        generateSigningKeyPair(),
        generateEncryptionKeyPair(),
        generateSigningKeyPair(),
      ])
      setAlice({ name: 'Alice', encrypt: aEnc, sign: aSig })
      setBob({ name: 'Bob', encrypt: bEnc, sign: bSig })
      _setEve({ name: 'Eve', encrypt: eEnc, sign: eSig })
    }
    init()
  }, [])

  const sendFromAlice = async () => {
    if (!alice || !bob || !message) return
    const ciphertext = await encryptString(bob.encrypt.publicKey, message)
    const signature = await signString(alice.sign.privateKey, message)
    const maybeTampered = tamper ? ciphertext.slice(0, -8) + 'AAAAAAA=' : ciphertext
    const entry: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'Alice',
      ciphertext: maybeTampered,
      signature,
      timestamp: Date.now(),
    }
    setHistory((h) => [...h, entry])
    setMessage('')
  }

  const decryptAsBob = async (id: string) => {
    if (!bob || !alice) return
    const target = history.find((m) => m.id === id)
    if (!target) return
    try {
      const plaintext = await decryptToString(bob.encrypt.privateKey, target.ciphertext)
      const authentic = await verifySignature(alice.sign.publicKey, plaintext, target.signature || '')
      setHistory((prev) => prev.map((m) => (m.id === id ? { ...m, plaintext, authentic } : m)))
    } catch {
      setHistory((prev) => prev.map((m) => (m.id === id ? { ...m, plaintext: undefined, authentic: false, tampered: true } : m)))
    }
  }

  useEffect(() => {
    const run = async () => {
      if (alice) {
        setAliceEncPubJwk(await exportPublicKeyJwk(alice.encrypt.publicKey))
        setAliceEncPrivJwk(await exportPrivateKeyJwk(alice.encrypt.privateKey))
      }
      if (bob) {
        setBobEncPubJwk(await exportPublicKeyJwk(bob.encrypt.publicKey))
        setBobEncPrivJwk(await exportPrivateKeyJwk(bob.encrypt.privateKey))
      }
    }
    run()
  }, [alice, bob])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🕵️ Secret Agent Messenger</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80 flex items-center gap-2">
              <input type="checkbox" checked={tamper} onChange={(e) => setTamper(e.target.checked)} />
              Tamper Eve
            </label>
            <label className="text-sm opacity-80 flex items-center gap-2">
              <input type="checkbox" checked={gameMode} onChange={(e) => setGameMode(e.target.checked)} />
              Game Mode
            </label>
            <Button variant="outline" onClick={() => setShowKeys((s) => !s)}>
              {showKeys ? 'Hide Keys' : 'Show Keys'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <AgentCard name="Alice" emoji="👩‍💻" subtitle="Sender" onShowKeys={() => setShowKeys(true)} />
          <AgentCard name="Bob" emoji="👨‍💻" subtitle="Receiver" onShowKeys={() => setShowKeys(true)} />
          <AgentCard name="Eve" emoji="😈" subtitle="Eavesdropper" onShowKeys={() => setShowKeys(true)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Alice types a secret..."
                  className="flex-1 rounded-md bg-slate-800/70 border border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
                />
                <Button onClick={sendFromAlice}>Send → Encrypt + Sign</Button>
              </div>
              <div className="text-xs opacity-70 mt-2">Encrypted with Bob's public key. Signed by Alice.</div>
            </div>
            <ChatWindow messages={history} onDecrypt={decryptAsBob} />
          </div>
          <div className="space-y-4">
            {showKeys && (
              <div className="space-y-4">
                <KeyViewer title="Alice Encryption Keys" publicJwk={aliceEncPubJwk} privateJwk={aliceEncPrivJwk} />
                <KeyViewer title="Bob Encryption Keys" publicJwk={bobEncPubJwk} privateJwk={bobEncPrivJwk} />
              </div>
            )}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="font-semibold mb-2">How it works</div>
              <ol className="list-decimal pl-5 text-sm space-y-1 opacity-90">
                <li>Alice encrypts with Bob's public key</li>
                <li>Alice signs with her private key</li>
                <li>Bob decrypts with his private key and verifies signature</li>
                <li>Eve only sees ciphertext</li>
              </ol>
              {gameMode && (
                <div className="mt-3 text-sm">
                  <div className="font-semibold mb-1">Mission:</div>
                  <div className="opacity-90">Decrypt the riddle: "What has keys but can’t open locks?"</div>
                  <div className="mt-2 text-xs opacity-70">Tip: send it as Alice, then decrypt as Bob.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
