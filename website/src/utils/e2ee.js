/**
 * End-to-End Encryption (E2EE) Utility for CatchWatch Chat
 * Powered by native Web Crypto API (ECDH P-256 & AES-256-GCM)
 */

const KEY_STORAGE_PREFIX = "catchwatch_e2ee_";

// Helper: Convert ArrayBuffer to Base64 String
function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 String to Uint8Array
function base64ToBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate ECDH (P-256) Key Pair
 */
export async function generateKeyPair() {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not supported in this environment.");
  }

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    publicKeyJwk,
    privateKeyJwk,
    publicKeyString: JSON.stringify(publicKeyJwk),
    privateKeyString: JSON.stringify(privateKeyJwk),
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Import Public Key from JWK String or Object
 */
export async function importPublicKey(publicKeyJwkOrString) {
  if (!publicKeyJwkOrString) return null;
  try {
    const jwk = typeof publicKeyJwkOrString === "string"
      ? JSON.parse(publicKeyJwkOrString)
      : publicKeyJwkOrString;

    if (!jwk || typeof jwk !== "object" || !jwk.kty) return null;

    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      []
    );
  } catch (err) {
    console.warn("Failed to import public key:", err);
    return null;
  }
}

/**
 * Import Private Key from JWK String or Object
 */
export async function importPrivateKey(privateKeyJwkOrString) {
  if (!privateKeyJwkOrString) return null;
  try {
    const jwk = typeof privateKeyJwkOrString === "string"
      ? JSON.parse(privateKeyJwkOrString)
      : privateKeyJwkOrString;

    if (!jwk || typeof jwk !== "object" || !jwk.kty) return null;

    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );
  } catch (err) {
    console.warn("Failed to import private key:", err);
    return null;
  }
}

/**
 * Derive AES-256-GCM Shared Symmetric Key using ECDH
 */
export async function deriveSharedKey(privateKey, partnerPublicKey) {
  if (!privateKey || !partnerPublicKey) return null;
  try {
    return await window.crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: partnerPublicKey,
      },
      privateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );
  } catch (err) {
    console.warn("Failed to derive shared key:", err);
    return null;
  }
}

/**
 * Encrypt plain text using AES-256-GCM
 */
export async function encryptText(plainText, sharedKey) {
  if (!plainText) return { ciphertext: "", iv: "" };
  if (!sharedKey) return { ciphertext: plainText, iv: "" };

  const encoder = new TextEncoder();
  const encodedText = encoder.encode(plainText);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    sharedKey,
    encodedText
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt AES-256-GCM encrypted ciphertext
 */
export async function decryptText(ciphertextBase64, ivBase64, sharedKey) {
  if (!ciphertextBase64) return "";
  if (!ivBase64 || !sharedKey) return ciphertextBase64;

  // Check if text contains spaces or non-base64 characters (plain text message)
  if (
    typeof ciphertextBase64 === "string" &&
    (ciphertextBase64.includes(" ") || !/^[A-Za-z0-9+/=]+$/.test(ciphertextBase64.trim()))
  ) {
    return ciphertextBase64;
  }

  try {
    const ciphertext = base64ToBuffer(ciphertextBase64);
    const iv = base64ToBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      sharedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    // If text was short plain text or key session changed, fallback gracefully
    if (typeof ciphertextBase64 === "string" && ciphertextBase64.length < 50 && !ciphertextBase64.endsWith("=")) {
      return ciphertextBase64;
    }
    return "🔒 [Encrypted Message]";
  }
}

/**
 * Initialize E2EE for current user, generating keypair if missing and syncing public key
 */
export async function initUserE2EE(userId, savePublicKeyApi) {
  if (!userId) return null;

  try {
    const privKeyKey = `${KEY_STORAGE_PREFIX}priv_${userId}`;
    const pubKeyKey = `${KEY_STORAGE_PREFIX}pub_${userId}`;

    let privateKeyStr = localStorage.getItem(privKeyKey);
    let publicKeyStr = localStorage.getItem(pubKeyKey);

    if (!privateKeyStr || !publicKeyStr) {
      const generated = await generateKeyPair();
      privateKeyStr = generated.privateKeyString;
      publicKeyStr = generated.publicKeyString;

      localStorage.setItem(privKeyKey, privateKeyStr);
      localStorage.setItem(pubKeyKey, publicKeyStr);
    }

    // Ensure backend always has current user public key synced
    if (typeof savePublicKeyApi === "function" && publicKeyStr) {
      savePublicKeyApi(publicKeyStr).catch(() => {});
    }

    const privateKey = await importPrivateKey(privateKeyStr);
    const publicKey = await importPublicKey(publicKeyStr);

    return {
      privateKey,
      publicKey,
      publicKeyString: publicKeyStr,
    };
  } catch (err) {
    console.error("Failed to initialize user E2EE:", err);
    return null;
  }
}
