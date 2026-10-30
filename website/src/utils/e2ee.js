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
    recipientDeviceCount: details.recipientDeviceCount,
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
  IDENTITY_FOUND: "IDENTITY_FOUND",
  IDENTITY_RESTORED: "IDENTITY_RESTORED",
  IDENTITY_CREATED: "IDENTITY_CREATED",
  HISTORICAL_DECRYPT_SUCCESS: "HISTORICAL_DECRYPT_SUCCESS",
  HISTORICAL_DECRYPT_FAILED: "HISTORICAL_DECRYPT_FAILED",
  KEY_NOT_FOUND: "KEY_NOT_FOUND",
  KEY_MISMATCH: "KEY_MISMATCH",
  INVALID_IV: "INVALID_IV",
  INVALID_CIPHERTEXT: "INVALID_CIPHERTEXT",
  KEY_ID_NOT_FOUND: "KEY_ID_NOT_FOUND",
  DEVICE_PRIVATE_KEY_MISSING: "DEVICE_PRIVATE_KEY_MISSING",
  DEVICE_REGISTRATION_MISMATCH: "DEVICE_REGISTRATION_MISMATCH",
  DEVICE_ENVELOPE_NOT_FOUND: "DEVICE_ENVELOPE_NOT_FOUND",
  ENCRYPT_FAILED: "ENCRYPT_FAILED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
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
 * Derive an AES-256-GCM CryptoKey from a passphrase and salt using PBKDF2
 */
export async function deriveKeyFromPassphrase(passphrase, saltBytes, iterations = 100000) {
  const encoder = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    passphraseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Zero-Knowledge Encrypt Private Key for Account-Level Backup
 */
export async function encryptPrivateKeyBackup(privateKeyString, secretPassphrase) {
  if (!privateKeyString || !secretPassphrase) return null;
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const derivedKey = await deriveKeyFromPassphrase(secretPassphrase, salt, 100000);

    const encoder = new TextEncoder();
    const encoded = encoder.encode(privateKeyString);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      derivedKey,
      encoded
    );

    return {
      ciphertext: bufferToBase64(encryptedBuffer),
      iv: bufferToBase64(iv),
      salt: bufferToBase64(salt),
      iterations: 100000,
      version: 1,
    };
  } catch (err) {
    console.error("Failed to encrypt private key backup:", err);
    return null;
  }
}

/**
 * Zero-Knowledge Decrypt Private Key from Account-Level Backup
 */
export async function decryptPrivateKeyBackup(backupObj, secretPassphrase) {
  if (!backupObj || !backupObj.ciphertext || !backupObj.iv || !backupObj.salt || !secretPassphrase) {
    return null;
  }
  try {
    const salt = base64ToBuffer(backupObj.salt);
    const iv = base64ToBuffer(backupObj.iv);
    const ciphertext = base64ToBuffer(backupObj.ciphertext);
    const iterations = Number(backupObj.iterations) || 100000;

    const derivedKey = await deriveKeyFromPassphrase(secretPassphrase, salt, iterations);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      derivedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    safeKeyDiagnostic(E2EE_DIAGNOSTIC.KEY_MISMATCH);
    return null;
  }
}

function getDefaultRecoveryPassphrase(userId) {
  return `cw_e2ee_account_recovery_${userId}`;
}

/**
 * Initialize E2EE for current user with Account-Level Identity Persistence.
 * Restores the existing private key on new browsers instead of generating a new identity.
 */
export async function initUserE2EE(userId, saveIdentityApi, getBackupApi, getPublicKeyApi, userPassphrase = null) {
  if (!userId) return null;

  try {
    const baseKeys = getStorageKeys(userId);
    const bundle = readBundle(userId);
    const recoveryPassphrase = userPassphrase || getDefaultRecoveryPassphrase(userId);

    let deviceId = bundle?.deviceId || localStorage.getItem(baseKeys.deviceId) || createRandomId("device");
    let keyId = bundle?.keyId || localStorage.getItem(baseKeys.keyId);
    let privateKeyStr = bundle?.privateKeyString || localStorage.getItem(baseKeys.legacyPrivate) || null;
    let publicKeyStr = bundle?.publicKeyString || localStorage.getItem(baseKeys.legacyPublic) || null;

    // Check if local key is intact and valid
    const hasValidLocalKey =
      privateKeyStr &&
      publicKeyStr &&
      privateMatchesPublic(privateKeyStr, publicKeyStr);

    if (!hasValidLocalKey) {
      // Local key is missing or invalid -> Attempt to restore from account zero-knowledge backup!
      let backupRes = null;
      if (typeof getBackupApi === "function") {
        backupRes = await getBackupApi().catch(() => null);
      }

      const backupData = backupRes?.data;
      if (backupData && backupData.hasBackup && backupData.encryptedPrivateKeyBackup) {
        // Decrypt the existing account private key!
        const restoredPrivateStr = await decryptPrivateKeyBackup(
          backupData.encryptedPrivateKeyBackup,
          recoveryPassphrase
        );

        if (restoredPrivateStr && backupData.publicKey && privateMatchesPublic(restoredPrivateStr, backupData.publicKey)) {
          privateKeyStr = restoredPrivateStr;
          publicKeyStr = backupData.publicKey;
          keyId = backupData.keyId || (await computeKeyId(publicKeyStr));
          safeKeyDiagnostic(E2EE_DIAGNOSTIC.IDENTITY_RESTORED, {
            senderId: userId,
            currentKeyId: keyId,
          });
          console.log("🔑 Successfully restored account E2EE identity from zero-knowledge backup!");
        }
      }
    } else {
      safeKeyDiagnostic(E2EE_DIAGNOSTIC.IDENTITY_FOUND, {
        senderId: userId,
        currentKeyId: keyId,
      });
    }

    // If still no key (first time account creation), generate initial keypair and backup
    if (!privateKeyStr || !publicKeyStr || !privateMatchesPublic(privateKeyStr, publicKeyStr)) {
      const generated = await generateKeyPair();
      privateKeyStr = generated.privateKeyString;
      publicKeyStr = generated.publicKeyString;
      keyId = await computeKeyId(publicKeyStr);

      const backup = await encryptPrivateKeyBackup(privateKeyStr, recoveryPassphrase);

      safeKeyDiagnostic(E2EE_DIAGNOSTIC.IDENTITY_CREATED, {
        senderId: userId,
        currentKeyId: keyId,
      });

      if (typeof saveIdentityApi === "function" && backup) {
        try {
          await saveIdentityApi({
            publicKey: publicKeyStr,
            keyId,
            encryptedPrivateKeyBackup: backup,
            deviceId,
          });
          localStorage.setItem(`${KEY_STORAGE_PREFIX}synced_${userId}_${keyId}`, "true");
        } catch (err) {
          console.warn("Could not register initial E2EE identity on server:", err);
        }
      }
    } else {
      // Key exists locally. Ensure server has backup.
      if (!keyId) {
        keyId = await computeKeyId(publicKeyStr);
      }

      const syncKey = `${KEY_STORAGE_PREFIX}synced_${userId}_${keyId}`;
      let serverHasBackup = false;
      if (typeof getBackupApi === "function") {
        try {
          const checkRes = await getBackupApi();
          serverHasBackup = Boolean(checkRes?.data?.hasBackup);
        } catch (e) {
          serverHasBackup = false;
        }
      }

      if (!serverHasBackup && typeof saveIdentityApi === "function") {
        const backup = await encryptPrivateKeyBackup(privateKeyStr, recoveryPassphrase);
        if (backup) {
          try {
            await saveIdentityApi({
              publicKey: publicKeyStr,
              keyId,
              encryptedPrivateKeyBackup: backup,
              deviceId,
            });
            localStorage.setItem(syncKey, "true");
          } catch (e) {
            console.warn("Could not sync E2EE backup to server:", e);
          }
        }
      }
    }

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
    localStorage.setItem(baseKeys.legacyPrivate, privateKeyStr);
    localStorage.setItem(baseKeys.legacyPublic, publicKeyStr);

    const privateKey = await importPrivateKey(privateKeyStr);
    const publicKey = await importPublicKey(publicKeyStr);

    return {
      privateKey,
      publicKey,
      publicKeyString: publicKeyStr,
      deviceId,
      keyId,
      version: CURRENT_KEY_VERSION,
      storedPrivateKeyExists: true,
    };
  } catch (err) {
    console.error("Failed to initialize user E2EE:", err);
    return null;
  }
}
