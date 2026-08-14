/**
 * End-to-End Encryption (E2EE) Utility for CatchWatch Chat
 * Powered by native Web Crypto API (ECDH P-256 & AES-256-GCM)
 */

const KEY_STORAGE_PREFIX = "catchwatch_e2ee_";
const CURRENT_KEY_VERSION = 2;

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

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createRandomId(prefix) {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}_${bytesToHex(bytes)}`;
}

async function sha256Text(text) {
  const encoded = new TextEncoder().encode(text);
  const hash = await window.crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(hash));
}

function safeKeyDiagnostic(code, details = {}) {
  const safeDetails = {
    messageId: details.messageId,
    senderId: details.senderId,
    recipientId: details.recipientId,
    currentDeviceId: details.currentDeviceId,
    currentKeyId: details.currentKeyId,
    storedPrivateKeyExists: details.storedPrivateKeyExists,
    serverRegisteredDeviceId: details.serverRegisteredDeviceId,
    serverRegisteredKeyId: details.serverRegisteredKeyId,
    senderDeviceId: details.senderDeviceId,
    senderKeyId: details.senderKeyId,
    recipientDeviceId: details.recipientDeviceId,
    recipientKeyId: details.recipientKeyId,
    envelopeCount: details.envelopeCount,
  };
  console.warn(`[E2EE:${code}]`, safeDetails);
}

export const E2EE_DIAGNOSTIC = {
  KEY_NOT_FOUND: "KEY_NOT_FOUND",
  KEY_MISMATCH: "KEY_MISMATCH",
  INVALID_IV: "INVALID_IV",
  INVALID_CIPHERTEXT: "INVALID_CIPHERTEXT",
  KEY_ID_NOT_FOUND: "KEY_ID_NOT_FOUND",
  DEVICE_PRIVATE_KEY_MISSING: "DEVICE_PRIVATE_KEY_MISSING",
  DEVICE_REGISTRATION_MISMATCH: "DEVICE_REGISTRATION_MISMATCH",
  DEVICE_ENVELOPE_NOT_FOUND: "DEVICE_ENVELOPE_NOT_FOUND",
};

export { safeKeyDiagnostic };

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

function getStorageKeys(userId, deviceId = "", keyId = "") {
  return {
    legacyPrivate: `${KEY_STORAGE_PREFIX}priv_${userId}`,
    legacyPublic: `${KEY_STORAGE_PREFIX}pub_${userId}`,
    deviceId: `${KEY_STORAGE_PREFIX}device_${userId}`,
    keyId: `${KEY_STORAGE_PREFIX}keyid_${userId}`,
    privateByDevice: `${KEY_STORAGE_PREFIX}priv_${userId}_${deviceId}_${keyId}`,
    publicByDevice: `${KEY_STORAGE_PREFIX}pub_${userId}_${deviceId}_${keyId}`,
    bundle: `${KEY_STORAGE_PREFIX}bundle_${userId}`,
  };
}

function readBundle(userId) {
  try {
    const raw = localStorage.getItem(getStorageKeys(userId).bundle);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function writeBundle(userId, bundle) {
  localStorage.setItem(getStorageKeys(userId).bundle, JSON.stringify(bundle));
}

async function computeKeyId(publicKeyString) {
  return `p256_${(await sha256Text(publicKeyString)).slice(0, 32)}`;
}

function privateMatchesPublic(privateKeyStr, publicKeyStr) {
  try {
    const privateJwk = JSON.parse(privateKeyStr);
    const publicJwk = JSON.parse(publicKeyStr);
    return privateJwk?.x === publicJwk?.x && privateJwk?.y === publicJwk?.y;
  } catch (err) {
    return false;
  }
}

function findRegisteredDevice(deviceKeys, deviceId, keyId) {
  if (!Array.isArray(deviceKeys)) return null;
  return deviceKeys.find((key) => key.deviceId === deviceId && key.keyId === keyId) || null;
}

function findRegisteredDeviceById(deviceKeys, deviceId) {
  if (!Array.isArray(deviceKeys)) return null;
  return deviceKeys.find((key) => key.deviceId === deviceId) || null;
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
  if (!sharedKey) return null; // Signal that shared key is missing and decryption should be retried
  if (!ivBase64) return ciphertextBase64;

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
    if (iv.byteLength !== 12) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.INVALID_IV);
      return null;
    }
    if (ciphertext.byteLength < 16) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.INVALID_CIPHERTEXT);
      return null;
    }

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
    safeKeyDiagnostic(E2EE_DIAGNOSTIC.KEY_MISMATCH);
    return null;
  }
}

/**
 * Initialize E2EE for current user. A browser/device gets one stable deviceId,
 * keyId and keypair; if the device identity exists but its private key is gone,
 * do not silently replace it.
 */
export async function initUserE2EE(userId, savePublicKeyApi, getPublicKeyApi) {
  if (!userId) return null;

  try {
    const baseKeys = getStorageKeys(userId);
    const bundle = readBundle(userId);

    let deviceId = bundle?.deviceId || localStorage.getItem(baseKeys.deviceId);
    let keyId = bundle?.keyId || localStorage.getItem(baseKeys.keyId);
    let privateKeyStr = bundle?.privateKeyString || null;
    let publicKeyStr = bundle?.publicKeyString || null;

    if (!deviceId) {
      const legacyPrivate = localStorage.getItem(baseKeys.legacyPrivate);
      const legacyPublic = localStorage.getItem(baseKeys.legacyPublic);
      if (legacyPrivate && legacyPublic && privateMatchesPublic(legacyPrivate, legacyPublic)) {
        deviceId = createRandomId("device");
        publicKeyStr = legacyPublic;
        privateKeyStr = legacyPrivate;
        keyId = await computeKeyId(publicKeyStr);
      }
    }

    if (!deviceId) {
      const generated = await generateKeyPair();
      deviceId = createRandomId("device");
      privateKeyStr = generated.privateKeyString;
      publicKeyStr = generated.publicKeyString;
      keyId = await computeKeyId(publicKeyStr);
    }

    if (deviceId && keyId && (!privateKeyStr || !publicKeyStr)) {
      const deviceKeys = getStorageKeys(userId, deviceId, keyId);
      privateKeyStr = localStorage.getItem(deviceKeys.privateByDevice);
      publicKeyStr = localStorage.getItem(deviceKeys.publicByDevice);
    }

    if (deviceId && keyId && (!privateKeyStr || !publicKeyStr)) {
      let serverRegisteredDeviceId = "";
      let serverRegisteredKeyId = "";
      if (typeof getPublicKeyApi === "function") {
        const keyRes = await getPublicKeyApi(userId).catch(() => null);
        const registered = findRegisteredDevice(keyRes?.data?.deviceKeys, deviceId, keyId) ||
          findRegisteredDeviceById(keyRes?.data?.deviceKeys, deviceId);
        serverRegisteredDeviceId = registered?.deviceId || "";
        serverRegisteredKeyId = registered?.keyId || "";
      }
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.DEVICE_PRIVATE_KEY_MISSING, {
        currentDeviceId: deviceId,
        currentKeyId: keyId,
        storedPrivateKeyExists: !!privateKeyStr,
        serverRegisteredDeviceId,
        serverRegisteredKeyId,
      });
      return {
        deviceId,
        keyId,
        privateKey: null,
        publicKey: null,
        publicKeyString: publicKeyStr || "",
        error: E2EE_DIAGNOSTIC.DEVICE_PRIVATE_KEY_MISSING,
        storedPrivateKeyExists: !!privateKeyStr,
        serverRegisteredDeviceId,
        serverRegisteredKeyId,
      };
    }

    const computedKeyId = await computeKeyId(publicKeyStr);
    if (!keyId) {
      keyId = computedKeyId;
    }

    if (keyId !== computedKeyId || !privateMatchesPublic(privateKeyStr, publicKeyStr)) {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.DEVICE_REGISTRATION_MISMATCH, {
        currentDeviceId: deviceId,
        currentKeyId: keyId,
        storedPrivateKeyExists: !!privateKeyStr,
      });
      return {
        deviceId,
        keyId,
        privateKey: null,
        publicKey: null,
        publicKeyString: publicKeyStr,
        error: E2EE_DIAGNOSTIC.DEVICE_REGISTRATION_MISMATCH,
        storedPrivateKeyExists: !!privateKeyStr,
      };
    }

    const deviceKeys = getStorageKeys(userId, deviceId, keyId);
    const normalizedBundle = {
      version: CURRENT_KEY_VERSION,
      deviceId,
      keyId,
      publicKeyString: publicKeyStr,
      privateKeyString: privateKeyStr,
    };
    writeBundle(userId, normalizedBundle);
    localStorage.setItem(baseKeys.deviceId, deviceId);
    localStorage.setItem(baseKeys.keyId, keyId);
    localStorage.setItem(deviceKeys.privateByDevice, privateKeyStr);
    localStorage.setItem(deviceKeys.publicByDevice, publicKeyStr);
    localStorage.setItem(baseKeys.legacyPrivate, privateKeyStr);
    localStorage.setItem(baseKeys.legacyPublic, publicKeyStr);

    // Register this browser/device key without overwriting other devices.
    if (typeof savePublicKeyApi === "function" && publicKeyStr) {
      await savePublicKeyApi({ publicKey: publicKeyStr, deviceId, keyId }).catch(() => null);
    }

    let serverRegisteredDeviceId = "";
    let serverRegisteredKeyId = "";
    if (typeof getPublicKeyApi === "function") {
      const keyRes = await getPublicKeyApi(userId).catch(() => null);
      const registered = findRegisteredDevice(keyRes?.data?.deviceKeys, deviceId, keyId);
      const registeredByDevice = registered || findRegisteredDeviceById(keyRes?.data?.deviceKeys, deviceId);
      serverRegisteredDeviceId = registeredByDevice?.deviceId || "";
      serverRegisteredKeyId = registeredByDevice?.keyId || "";

      if (!registered || registered.publicKey !== publicKeyStr) {
        safeKeyDiagnostic(E2EE_DIAGNOSTIC.DEVICE_REGISTRATION_MISMATCH, {
          currentDeviceId: deviceId,
          currentKeyId: keyId,
          storedPrivateKeyExists: true,
          serverRegisteredDeviceId,
          serverRegisteredKeyId,
        });
      }
    }

    const privateKey = await importPrivateKey(privateKeyStr);
    const publicKey = await importPublicKey(publicKeyStr);

    return {
      privateKey,
      publicKey,
      publicKeyString: publicKeyStr,
      deviceId,
      keyId,
      version: CURRENT_KEY_VERSION,
      storedPrivateKeyExists: !!privateKeyStr,
      serverRegisteredDeviceId,
      serverRegisteredKeyId,
    };
  } catch (err) {
    console.error("Failed to initialize user E2EE:", err);
    return null;
  }
}
