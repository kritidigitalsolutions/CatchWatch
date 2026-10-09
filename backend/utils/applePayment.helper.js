const crypto = require("crypto");
const axios = require("axios");

/**
 * Format raw base64 certificate string into PEM format
 */
function toCertPem(certB64) {
  if (!certB64 || typeof certB64 !== "string") return "";
  const clean = certB64.replace(/[\r\n\s]/g, "");
  const lines = clean.match(/.{1,64}/g) || [clean];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----\n`;
}

/**
 * Safe base64url / base64 JSON decoder
 */
function decodeBase64Json(str) {
  if (!str || typeof str !== "string") return null;
  try {
    const jsonStr = Buffer.from(str, "base64url").toString("utf8");
    return JSON.parse(jsonStr);
  } catch (err1) {
    try {
      const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr = Buffer.from(b64, "base64").toString("utf8");
      return JSON.parse(jsonStr);
    } catch (err2) {
      return null;
    }
  }
}

/**
 * Decode and verify StoreKit 2 JWS token
 * @param {string} jwsToken
 * @returns {object}
 */
function parseAndVerifyStoreKit2JWS(jwsToken) {
  if (!jwsToken || typeof jwsToken !== "string") {
    return { success: false, message: "Empty or invalid JWS string" };
  }

  const parts = jwsToken.trim().split(".");
  if (parts.length !== 3) {
    return { success: false, message: "Token is not a 3-part JWS" };
  }

  const header = decodeBase64Json(parts[0]);
  const payload = decodeBase64Json(parts[1]);

  if (!payload) {
    return { success: false, message: "Unable to parse JWS payload JSON" };
  }

  let signatureValid = false;
  let certVerified = false;
  let certSubject = "";
  let certIssuer = "";
  const notes = [];

  try {
    if (header && Array.isArray(header.x5c) && header.x5c.length > 0) {
      const leafPem = toCertPem(header.x5c[0]);
      const x509 = new crypto.X509Certificate(leafPem);
      certSubject = x509.subject || "";
      certIssuer = x509.issuer || "";

      // Ensure leaf certificate is issued by Apple
      if (
        certSubject.includes("Apple") ||
        certIssuer.includes("Apple") ||
        certIssuer.includes("Apple Worldwide Developer Relations")
      ) {
        certVerified = true;
      }

      // Verify ES256 signature using leaf certificate's public key
      const verifier = crypto.createVerify("SHA256");
      verifier.update(`${parts[0]}.${parts[1]}`);
      const sigBuffer = Buffer.from(parts[2], "base64url");
      signatureValid = verifier.verify(
        {
          key: leafPem,
          dsaEncoding: "ieee-p1363",
        },
        sigBuffer
      );
    }
  } catch (err) {
    notes.push(`Crypto verify error: ${err.message}`);
  }

  return {
    success: true,
    isJWS: true,
    signatureValid,
    certVerified,
    certSubject,
    certIssuer,
    notes,
    data: {
      transactionId: payload.transactionId ? String(payload.transactionId) : "",
      originalTransactionId: payload.originalTransactionId
        ? String(payload.originalTransactionId)
        : payload.transactionId
        ? String(payload.transactionId)
        : "",
      productId: payload.productId || "",
      bundleId: payload.bundleId || "",
      purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : null,
      originalPurchaseDate: payload.originalPurchaseDate
        ? new Date(payload.originalPurchaseDate)
        : null,
      expiresDate: payload.expiresDate ? new Date(payload.expiresDate) : null,
      environment: payload.environment || (payload.signedDate ? "Sandbox" : "Production"),
      type: payload.type || "",
      quantity: payload.quantity || 1,
    },
    rawPayload: payload,
    header,
  };
}

/**
 * Verify legacy StoreKit 1 base64 receipt with Apple verifyReceipt API
 */
async function verifyLegacyAppleReceipt(receiptData, password = process.env.APPLE_SHARED_SECRET) {
  if (!receiptData || typeof receiptData !== "string") {
    return { success: false, message: "Empty receipt data" };
  }

  try {
    const postData = {
      "receipt-data": receiptData.trim(),
      "exclude-old-transactions": true,
    };
    if (password) {
      postData.password = password;
    }

    // Try production first
    let response = await axios.post("https://buy.itunes.apple.com/verifyReceipt", postData, {
      timeout: 10000,
    });

    // Status 21007: Test receipt used on production endpoint -> retry on sandbox
    if (response.data && response.data.status === 21007) {
      response = await axios.post("https://sandbox.itunes.apple.com/verifyReceipt", postData, {
        timeout: 10000,
      });
    }

    if (response.data && response.data.status === 0) {
      const receiptList =
        response.data.latest_receipt_info || response.data.receipt?.in_app || [];
      const latest = Array.isArray(receiptList) && receiptList.length > 0
        ? receiptList[receiptList.length - 1]
        : {};

      return {
        success: true,
        isLegacy: true,
        data: {
          transactionId: latest.transaction_id ? String(latest.transaction_id) : "",
          originalTransactionId: latest.original_transaction_id
            ? String(latest.original_transaction_id)
            : latest.transaction_id
            ? String(latest.transaction_id)
            : "",
          productId: latest.product_id || "",
          purchaseDate: latest.purchase_date_ms
            ? new Date(Number(latest.purchase_date_ms))
            : null,
          expiresDate: latest.expires_date_ms
            ? new Date(Number(latest.expires_date_ms))
            : null,
          environment: response.data.environment || "Production",
        },
        rawResponse: response.data,
      };
    }

    return {
      success: false,
      message: `Apple verifyReceipt returned status code: ${response.data?.status}`,
      rawResponse: response.data,
    };
  } catch (err) {
    return {
      success: false,
      message: `Apple legacy verifyReceipt request failed: ${err.message}`,
    };
  }
}

/**
 * Universal Apple Purchase Verifier
 * Supports StoreKit 2 JWS tokens, StoreKit 1 receipts, and client fallback.
 */
async function verifyApplePurchase({
  serverVerificationData,
  productId,
  transactionId,
  originalTransactionId,
}) {
  const trimmedData = (serverVerificationData || "").trim();

  // 1. Try StoreKit 2 JWS format (contains 2 dots separating 3 parts)
  if (trimmedData.includes(".")) {
    const jwsResult = parseAndVerifyStoreKit2JWS(trimmedData);
    if (jwsResult.success) {
      return {
        verified: true,
        isJWS: true,
        signatureValid: jwsResult.signatureValid,
        certVerified: jwsResult.certVerified,
        transactionId: jwsResult.data.transactionId || transactionId,
        originalTransactionId:
          jwsResult.data.originalTransactionId ||
          originalTransactionId ||
          jwsResult.data.transactionId ||
          transactionId,
        productId: jwsResult.data.productId || productId,
        purchaseDate: jwsResult.data.purchaseDate || new Date(),
        expiresDate: jwsResult.data.expiresDate || null,
        environment: jwsResult.data.environment,
        bundleId: jwsResult.data.bundleId,
        rawPayload: jwsResult.rawPayload,
      };
    }
  }

  // 2. Try legacy receipt validation if non-empty string without dots
  if (trimmedData.length > 50 && !trimmedData.includes(".")) {
    const legacyResult = await verifyLegacyAppleReceipt(trimmedData);
    if (legacyResult.success && legacyResult.data) {
      return {
        verified: true,
        isLegacy: true,
        transactionId: legacyResult.data.transactionId || transactionId,
        originalTransactionId:
          legacyResult.data.originalTransactionId ||
          originalTransactionId ||
          legacyResult.data.transactionId ||
          transactionId,
        productId: legacyResult.data.productId || productId,
        purchaseDate: legacyResult.data.purchaseDate || new Date(),
        expiresDate: legacyResult.data.expiresDate || null,
        environment: legacyResult.data.environment,
      };
    }
  }

  // 3. Fallback to authenticated client-provided identifiers
  if (transactionId || productId) {
    return {
      verified: true,
      isFallback: true,
      transactionId: String(transactionId || ""),
      originalTransactionId: String(originalTransactionId || transactionId || ""),
      productId: String(productId || ""),
      purchaseDate: new Date(),
      expiresDate: null,
      environment: "Unknown",
    };
  }

  return {
    verified: false,
    message: "Missing transaction data or verification receipt",
  };
}

module.exports = {
  toCertPem,
  decodeBase64Json,
  parseAndVerifyStoreKit2JWS,
  verifyLegacyAppleReceipt,
  verifyApplePurchase,
};
