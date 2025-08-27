import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import "./App.css"

// --- Type Definitions ---
interface Agent {
  name: string;
  avatar: string;
  // Separate key pairs for signing and encryption
  signingKeys: CryptoKeyPair | null;
  encryptionKeys: CryptoKeyPair | null;
  publicKeysPem: {
    signing: string | null;
    encryption: string | null;
  };
  isUser: boolean;
}

interface Message {
  id: number;
  sender: string;
  originalText: string;
  ciphertext: ArrayBuffer;
  signature: ArrayBuffer;
  isSigned: boolean;
  isEncrypted: boolean;
  isTampered: boolean;
  isDecrypted: boolean;
  isVerified: boolean | null;
  isEve: boolean;
}

interface AgentsState {
  alice: Agent;
  bob: Agent;
  eve: Agent;
}

// --- Main App Component ---
export default function App() {
  // --- Agent and Key State ---
  const [agents, setAgents] = useState<AgentsState>({
    alice: { name: 'Alice', avatar: '👩‍💻', signingKeys: null, encryptionKeys: null, publicKeysPem: { signing: null, encryption: null }, isUser: true },
    bob: { name: 'Bob', avatar: '👨‍💻', signingKeys: null, encryptionKeys: null, publicKeysPem: { signing: null, encryption: null }, isUser: false },
    eve: { name: 'Eve', avatar: '😈', signingKeys: null, encryptionKeys: null, publicKeysPem: { signing: null, encryption: null }, isUser: false },
  });

  // --- Message and UI State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- RSA Utility Functions (using Web Crypto API) ---

  /**
   * Generates a new RSA key pair for signing and verification.
   * @returns {Promise<CryptoKeyPair>} A promise that resolves with the key pair.
   */
  const generateSigningKeypair = async (): Promise<CryptoKeyPair> => {
    return window.crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // Can be exported
      ['sign', 'verify']
    );
  };

  /**
   * Generates a new RSA key pair for encryption and decryption.
   * @returns {Promise<CryptoKeyPair>} A promise that resolves with the key pair.
   */
  const generateEncryptionKeypair = async (): Promise<CryptoKeyPair> => {
    return window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // Can be exported
      ['encrypt', 'decrypt']
    );
  };

  /**
   * Converts a string to an ArrayBuffer.
   * @param {string} str The string to convert.
   * @returns {ArrayBuffer} The ArrayBuffer.
   */
  const stringToArrayBuffer = (str: string): ArrayBuffer => {
    return new TextEncoder().encode(str).buffer;
  };

  /**
   * Converts an ArrayBuffer to a string.
   * @param {ArrayBuffer} buffer The ArrayBuffer to convert.
   * @returns {string} The string.
   */
  const arrayBufferToString = (buffer: ArrayBuffer): string => {
    return new TextDecoder().decode(buffer);
  };

  /**
   * Encrypts a message using an encryption public key.
   * @param {CryptoKey} publicKey The public key for encryption.
   * @param {string} message The message to encrypt.
   * @returns {Promise<ArrayBuffer>} The encrypted message as an ArrayBuffer.
   */
  const encryptWithPublicKey = async (publicKey: CryptoKey, message: string): Promise<ArrayBuffer> => {
    const encodedMessage = stringToArrayBuffer(message);
    return window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      encodedMessage
    );
  };

  /**
   * Decrypts a message using a decryption private key.
   * @param {CryptoKey} privateKey The private key for decryption.
   * @param {ArrayBuffer} encryptedMessage The message to decrypt.
   * @returns {Promise<string>} The decrypted message as a string.
   */
  const decryptWithPrivateKey = async (privateKey: CryptoKey, encryptedMessage: ArrayBuffer): Promise<string> => {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedMessage
    );
    return arrayBufferToString(decryptedBuffer);
  };

  /**
   * Signs a message with a signing private key.
   * @param {CryptoKey} privateKey The private key for signing.
   * @param {string} message The message to sign.
   * @returns {Promise<ArrayBuffer>} The signature.
   */
  const signMessage = async (privateKey: CryptoKey, message: string): Promise<ArrayBuffer> => {
    const encodedMessage = stringToArrayBuffer(message);
    return window.crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      privateKey,
      encodedMessage
    );
  };

  /**
   * Verifies a signature using a signing public key.
   * @param {CryptoKey} publicKey The public key for verification.
   * @param {ArrayBuffer} signature The signature to verify.
   * @param {string} message The original message.
   * @returns {Promise<boolean>} True if the signature is valid, false otherwise.
   */
  const verifySignature = async (publicKey: CryptoKey, signature: ArrayBuffer, message: string): Promise<boolean> => {
    const encodedMessage = stringToArrayBuffer(message);
    return window.crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      publicKey,
      signature,
      encodedMessage
    );
  };

  /**
   * Exports a public key to PEM format for display.
   * @param {CryptoKey} key The key to export.
   * @returns {Promise<string>} The key in PEM format.
   */
  const exportPublicKeyPem = async (key: CryptoKey, usage: 'sign' | 'encrypt'): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey(usage === 'sign' ? 'spki' : 'spki', key);
    const pem = btoa(String.fromCharCode(...new Uint8Array(exported)));
    const header = usage === 'sign' ? 'BEGIN PUBLIC KEY' : 'BEGIN PUBLIC KEY';
    const footer = usage === 'sign' ? 'END PUBLIC KEY' : 'END PUBLIC KEY';
    return `-----${header}-----\n${pem}\n-----${footer}-----`;
  };

  // --- Initial Setup on Component Mount ---
  useEffect(() => {
    const setupAgents = async () => {
      try {
        const [
          aliceSigningKeys, aliceEncryptionKeys,
          bobSigningKeys, bobEncryptionKeys,
          eveSigningKeys, eveEncryptionKeys,
        ] = await Promise.all([
          generateSigningKeypair(), generateEncryptionKeypair(),
          generateSigningKeypair(), generateEncryptionKeypair(),
          generateSigningKeypair(), generateEncryptionKeypair(),
        ]);
        
        // Export public keys to PEM format for display
        const [
          aliceSigningPem, aliceEncryptionPem,
          bobSigningPem, bobEncryptionPem,
          eveSigningPem, eveEncryptionPem,
        ] = await Promise.all([
          exportPublicKeyPem(aliceSigningKeys.publicKey, 'sign'),
          exportPublicKeyPem(aliceEncryptionKeys.publicKey, 'encrypt'),
          exportPublicKeyPem(bobSigningKeys.publicKey, 'sign'),
          exportPublicKeyPem(bobEncryptionKeys.publicKey, 'encrypt'),
          exportPublicKeyPem(eveSigningKeys.publicKey, 'sign'),
          exportPublicKeyPem(eveEncryptionKeys.publicKey, 'encrypt'),
        ]);

        setAgents({
          alice: { ...agents.alice, signingKeys: aliceSigningKeys, encryptionKeys: aliceEncryptionKeys, publicKeysPem: { signing: aliceSigningPem, encryption: aliceEncryptionPem } },
          bob: { ...agents.bob, signingKeys: bobSigningKeys, encryptionKeys: bobEncryptionKeys, publicKeysPem: { signing: bobSigningPem, encryption: bobEncryptionPem } },
          eve: { ...agents.eve, signingKeys: eveSigningKeys, encryptionKeys: eveEncryptionKeys, publicKeysPem: { signing: eveSigningPem, encryption: eveEncryptionPem } },
        });
      } catch (error) {
        console.error("Failed to generate keys:", error);
      }
    };
    setupAgents();
  }, []);

  // --- Autoscroll to the bottom of the chat window ---
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- Event Handlers ---

  /**
   * Handles sending a message from Alice to Bob.
   * @param {FormEvent} e The form event.
   */
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !agents.bob.encryptionKeys || !agents.alice.signingKeys) return;
    
    // Encrypt the message with Bob's public encryption key
    const encryptedData = await encryptWithPublicKey(agents.bob.encryptionKeys.publicKey, inputMessage);
    // Sign the message with Alice's private signing key
    const signature = await signMessage(agents.alice.signingKeys.privateKey, inputMessage);

    // Create a new message object
    const newMessage: Message = {
      id: Date.now(),
      sender: 'Alice',
      originalText: inputMessage,
      ciphertext: encryptedData,
      signature: signature,
      isSigned: true,
      isEncrypted: true,
      isTampered: false,
      isDecrypted: false,
      isVerified: null,
      isEve: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
  };

  /**
   * Decrypts a message for Bob.
   * @param {number} messageId The ID of the message to decrypt.
   */
  const handleDecryptMessage = async (messageId: number) => {
    const messageToDecrypt = messages.find((m) => m.id === messageId);
    if (!messageToDecrypt || !agents.bob.encryptionKeys || !agents.alice.signingKeys) return;
    
    try {
      // Decrypt the message with Bob's private encryption key
      const decryptedText = await decryptWithPrivateKey(agents.bob.encryptionKeys.privateKey, messageToDecrypt.ciphertext);
      
      // Verify the signature with Alice's public signing key
      let isVerified = false;
      if (messageToDecrypt.isSigned && agents.alice.signingKeys) {
        isVerified = await verifySignature(agents.alice.signingKeys.publicKey, messageToDecrypt.signature, decryptedText);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, originalText: decryptedText, isDecrypted: true, isVerified: isVerified, isEve: false } as Message
            : m
        )
      );
    } catch (error) {
      console.error("Decryption failed:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, originalText: 'Error: Could not decrypt message.', isDecrypted: true, isVerified: false, isEve: false } as Message
            : m
        )
      );
    }
  };

  /**
   * Simulates Eve tampering with a message.
   * @param {number} messageId The ID of the message to tamper with.
   */
  const handleTamperMessage = (messageId: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && !m.isTampered && m.isEncrypted) {
          // Change the first byte of the ciphertext to simulate tampering
          const tamperedCiphertext = new Uint8Array(m.ciphertext);
          if (tamperedCiphertext.length > 0) {
            tamperedCiphertext[0] = tamperedCiphertext[0] ^ 1; // Flip a bit
          }
          return { ...m, ciphertext: tamperedCiphertext.buffer, isTampered: true, originalText: 'EVE HAS TAMPERED WITH THIS MESSAGE!' };
        }
        return m;
      })
    );
  };

  /**
   * Toggles game mode and sends a new encrypted mission.
   */
  const handleGameMode = async () => {
    setGameMode(true);
    const missions = [
      'The package is under the third bench, near the fountain.',
      'The password is "Hydra" - mission at midnight.',
      'Find the informant at the old clock tower by dawn.',
    ];
    const missionText = missions[Math.floor(Math.random() * missions.length)];

    if (!agents.bob.encryptionKeys || !agents.alice.signingKeys) return;

    const encryptedData = await encryptWithPublicKey(agents.bob.encryptionKeys.publicKey, missionText);
    const signature = await signMessage(agents.alice.signingKeys.privateKey, missionText);

    const newMessage: Message = {
      id: Date.now(),
      sender: 'Alice',
      originalText: missionText,
      ciphertext: encryptedData,
      signature: signature,
      isSigned: true,
      isEncrypted: true,
      isTampered: false,
      isDecrypted: false,
      isVerified: null,
      isEve: false,
    };
    
    setMessages((prev) => [...prev, newMessage]);
  };

  // --- UI Layout and Rendering ---
  const renderAgentCard = (agent: Agent) => (
    <div className={`p-4 rounded-xl shadow-xl transition-transform transform ${agent.isUser ? 'bg-emerald-900 border-2 border-emerald-500' : agent.name === 'Eve' ? 'bg-red-900 border-2 border-red-500' : 'bg-sky-900 border-2 border-sky-500'} hover:scale-105`}>
      <div className="flex items-center space-x-4">
        <div className="text-4xl">{agent.avatar}</div>
        <div>
          <h2 className="text-lg font-bold text-gray-100">{agent.name}</h2>
          <p className="text-sm font-mono text-gray-400">Agent ID: {agent.publicKeysPem.signing ? `${agent.publicKeysPem.signing.substring(30, 40)}...` : 'Generating...'}</p>
        </div>
      </div>
    </div>
  );

  const renderMessageBubble = (message: Message) => {
    const isAlice = message.sender === 'Alice';
    const isBob = !isAlice; // In our simple app, Bob is the recipient of Alice's messages
    const isEve = message.isEve;

    // Framer Motion variants for the message bubble
    const bubbleVariants = {
      hidden: { scale: 0, opacity: 0, y: 50 },
      visible: { scale: 1, opacity: 1, y: 0 },
    };

    const springTransition = { type: 'spring', stiffness: 120, damping: 10 };

    return (
      // Corrected: The key is now on the top-level element in the list.
      <motion.div
        key={message.id}
        className={`relative p-4 rounded-xl shadow-lg my-2 max-w-lg ${isAlice ? 'bg-emerald-700 self-end' : isBob ? 'bg-sky-700 self-start' : isEve ? 'bg-red-700 self-start' : 'self-center'}`}
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        transition={springTransition}
      >
        <AnimatePresence>
          {/* Ciphertext message */}
          <motion.div
            className="font-mono text-yellow-300 text-sm break-all"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: message.isDecrypted ? 0 : 1, scale: message.isDecrypted ? 0.9 : 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {isEve ? 'Eavesdropping... 😈' : `🔒 Encrypted message: ${btoa(String.fromCharCode(...new Uint8Array(message.ciphertext))).substring(0, 50)}...`}
          </motion.div>
        </AnimatePresence>

        {/* Decrypted message - animates in */}
        {message.isDecrypted && (
          <motion.div
            className={`mt-2 font-sans text-white`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <h3 className="font-bold text-lg">{isBob ? 'Bob receives:' : 'Eve receives:'}</h3>
            <p>{message.originalText}</p>
            {message.isSigned && (
              <span className={`text-xs mt-2 font-mono flex items-center`}>
                Signature: {message.isVerified === true ? '✅ Authentic' : message.isVerified === false ? '❌ Forged' : 'Verifying...'}
              </span>
            )}
          </motion.div>
        )}

        {/* Action buttons for Bob and Eve */}
        {isBob && !message.isDecrypted && (
          <div className="mt-2 text-right">
            <button
              onClick={() => handleDecryptMessage(message.id)}
              className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold py-1 px-3 rounded-full transition-all"
            >
              Decrypt
            </button>
          </div>
        )}
        {isAlice && !isEve && !message.isDecrypted && (
          <div className="mt-2 flex space-x-2">
            <button
              onClick={() => handleTamperMessage(message.id)}
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold py-1 px-3 rounded-full transition-all"
            >
              Tamper
            </button>
            <button
              onClick={() => setMessages(prev => prev.map(m => m.id === message.id ? {...m, isEve: true} as Message : m))}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-1 px-3 rounded-full transition-all"
            >
              Eavesdrop
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white font-sans flex flex-col items-center p-4 sm:p-8">
      {/* Header and Agent Cards */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl text-center mb-8"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500 drop-shadow-md">
          Secret Agent Messenger
        </h1>
        <p className="text-lg mt-2 text-gray-400">A cryptographic demonstration</p>
      </motion.div>

      {/* Agents Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-5xl mb-8">
        {renderAgentCard(agents.alice)}
        {renderAgentCard(agents.bob)}
        {renderAgentCard(agents.eve)}
      </div>
      
      {/* Game Mode Status */}
      {gameMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-lg font-bold text-yellow-400 mb-4"
          >
            Mission Accepted! 🕵️
          </motion.div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button
          onClick={() => setShowKeys(!showKeys)}
          className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          {showKeys ? 'Hide Keys' : 'Show Keys'}
        </button>
        <button
          onClick={handleGameMode}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          🎮 Game Mode
        </button>
      </div>

      {/* Key Viewer Modal */}
      <AnimatePresence>
        {showKeys && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-3xl w-full"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
            >
              <h2 className="text-2xl font-bold text-center mb-4 text-white">Agent Keys</h2>
              <div className="space-y-4">
                {Object.values(agents).map(agent => (
                  <div key={agent.name} className="bg-gray-900 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2 text-gray-300">{agent.name}'s Keypairs</h3>
                    <div className="space-y-2">
                      <div className="bg-gray-700 p-3 rounded-md text-sm font-mono break-all text-gray-200">
                        <p className="font-bold text-cyan-400">Signing Public Key:</p>
                        <pre className="whitespace-pre-wrap">{agent.publicKeysPem.signing || 'Generating...'}</pre>
                      </div>
                      <div className="bg-gray-700 p-3 rounded-md text-sm font-mono break-all text-gray-200">
                        <p className="font-bold text-pink-400">Encryption Public Key:</p>
                        <pre className="whitespace-pre-wrap">{agent.publicKeysPem.encryption || 'Generating...'}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowKeys(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-full"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <div className="w-full max-w-5xl bg-gray-800 bg-opacity-50 p-6 rounded-3xl shadow-2xl flex flex-col h-[70vh] sm:h-[80vh]">
        <div className="flex-grow overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}>
          <div className="flex flex-col space-y-4 items-stretch">
            {messages.map((message) => renderMessageBubble(message))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="mt-4 flex items-center space-x-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your secret message..."
            className="flex-grow p-3 rounded-full bg-gray-700 text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          />
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all transform hover:scale-105"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
