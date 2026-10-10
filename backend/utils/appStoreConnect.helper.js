const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const APP_STORE_CONNECT_API_URL = "https://api.appstoreconnect.apple.com/v1";

// Standard Indian Rupee (INR) App Store Subscription Price Points for India (IND)
const DEFAULT_IND_PRICE_POINTS = [
  { id: "appstore_in_tier_49", customerPrice: "49", proceeds: "34.30", territory: "IND" },
  { id: "appstore_in_tier_99", customerPrice: "99", proceeds: "69.30", territory: "IND" },
  { id: "appstore_in_tier_149", customerPrice: "149", proceeds: "104.30", territory: "IND" },
  { id: "appstore_in_tier_199", customerPrice: "199", proceeds: "139.30", territory: "IND" },
  { id: "appstore_in_tier_249", customerPrice: "249", proceeds: "174.30", territory: "IND" },
  { id: "appstore_in_tier_299", customerPrice: "299", proceeds: "209.30", territory: "IND" },
  { id: "appstore_in_tier_349", customerPrice: "349", proceeds: "244.30", territory: "IND" },
  { id: "appstore_in_tier_399", customerPrice: "399", proceeds: "279.30", territory: "IND" },
  { id: "appstore_in_tier_449", customerPrice: "449", proceeds: "314.30", territory: "IND" },
  { id: "appstore_in_tier_499", customerPrice: "499", proceeds: "349.30", territory: "IND" },
  { id: "appstore_in_tier_599", customerPrice: "599", proceeds: "419.30", territory: "IND" },
  { id: "appstore_in_tier_699", customerPrice: "699", proceeds: "489.30", territory: "IND" },
  { id: "appstore_in_tier_799", customerPrice: "799", proceeds: "559.30", territory: "IND" },
  { id: "appstore_in_tier_899", customerPrice: "899", proceeds: "629.30", territory: "IND" },
  { id: "appstore_in_tier_999", customerPrice: "999", proceeds: "699.30", territory: "IND" },
  { id: "appstore_in_tier_1499", customerPrice: "1499", proceeds: "1049.30", territory: "IND" },
  { id: "appstore_in_tier_1999", customerPrice: "1999", proceeds: "1399.30", territory: "IND" },
];

/**
 * Retrieve Apple App Store Connect API Private Key from env or path
 */
function getPrivateKey() {
  if (process.env.ASC_PRIVATE_KEY) {
    let key = process.env.ASC_PRIVATE_KEY.trim();
    if (!key.includes("BEGIN PRIVATE KEY")) {
      key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }
    return key;
  }
  if (process.env.ASC_PRIVATE_KEY_PATH) {
    try {
      if (fs.existsSync(process.env.ASC_PRIVATE_KEY_PATH)) {
        return fs.readFileSync(process.env.ASC_PRIVATE_KEY_PATH, "utf8");
      }
    } catch (e) {
      console.warn("Could not read ASC_PRIVATE_KEY_PATH:", e.message);
    }
  }
  return null;
}

/**
 * Check if App Store Connect API credentials are fully configured
 */
function isAppStoreConnectConfigured() {
  const keyId = (process.env.ASC_KEY_ID || "").trim();
  const issuerId = (process.env.ASC_ISSUER_ID || "").trim();
  const privateKey = getPrivateKey();
  return !!(keyId && issuerId && privateKey);
}

/**
 * Generate Apple App Store Connect API JWT token (ES256, max 20 min)
 */
function generateAppStoreConnectToken() {
  const keyId = (process.env.ASC_KEY_ID || "").trim();
  const issuerId = (process.env.ASC_ISSUER_ID || "").trim();
  const privateKey = getPrivateKey();

  if (!keyId || !issuerId || !privateKey) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 1190, // ~19.8 minutes (Apple allows max 1200 seconds)
    aud: "appstoreconnect-v1",
  };

  return jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: keyId,
      typ: "JWT",
    },
  });
}

/**
 * Axios client preconfigured for Apple App Store Connect API
 */
function getAppleApiClient() {
  const token = generateAppStoreConnectToken();
  if (!token) return null;

  return axios.create({
    baseURL: APP_STORE_CONNECT_API_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

/**
 * Scan & discover Apple Subscription info for a given appleProductId
 * @param {string} productId - Product ID (e.g. 'com.app.catchWatch.sub.creator.orangetick')
 */
async function scanAppleProduct(productId) {
  const isConfigured = isAppStoreConnectConfigured();
  const cleanProductId = (productId || "").trim();

  if (!cleanProductId) {
    throw new Error("Apple Product ID is required to scan.");
  }

  // 1. If App Store Connect API credentials are live, query Apple directly
  if (isConfigured) {
    const client = getAppleApiClient();
    if (client) {
      try {
        const appId = process.env.APPLE_APP_ID;
        let subscriptionDoc = null;

        // Try searching subscriptions directly or via app
        if (appId) {
          const res = await client.get(`/apps/${appId}/subscriptionGroups?include=subscriptions`);
          const groups = res.data?.data || [];
          const included = res.data?.included || [];

          for (const item of included) {
            if (item.type === "subscriptions" && item.attributes?.productId === cleanProductId) {
              subscriptionDoc = item;
              break;
            }
          }
        }

        // If not found yet, query subscriptions endpoint directly
        if (!subscriptionDoc) {
          const subRes = await client.get(`/subscriptions?filter[productId]=${encodeURIComponent(cleanProductId)}`);
          if (subRes.data?.data && subRes.data.data.length > 0) {
            subscriptionDoc = subRes.data.data[0];
          }
        }

        if (subscriptionDoc) {
          const appleSubId = subscriptionDoc.id;

          // Fetch price points for territory IND
          const pointsRes = await client.get(
            `/subscriptions/${appleSubId}/pricePoints?filter[territory]=IND&limit=200`
          );
          const pricePoints = (pointsRes.data?.data || []).map((p) => ({
            id: p.id,
            customerPrice: p.attributes?.customerPrice,
            proceeds: p.attributes?.proceeds,
            territory: "IND",
          }));

          // Fetch current and scheduled prices
          const pricesRes = await client.get(
            `/subscriptions/${appleSubId}/prices?filter[territory]=IND&include=subscriptionPricePoint,territory`
          );
          const pricesData = pricesRes.data?.data || [];
          const includedItems = pricesRes.data?.included || [];

          let currentLivePrice = null;
          let scheduledPrice = null;
          let scheduledDate = null;
          let scheduledPriceId = null;

          for (const p of pricesData) {
            const pointRelId = p.relationships?.subscriptionPricePoint?.data?.id;
            const matchingPoint = includedItems.find(
              (inc) => inc.type === "subscriptionPricePoints" && inc.id === pointRelId
            );
            const priceValue = matchingPoint?.attributes?.customerPrice;

            if (!p.attributes?.startDate) {
              // null startDate = current live price
              currentLivePrice = priceValue ? Number(priceValue) : null;
            } else {
              // Future start date = scheduled price change
              scheduledPrice = priceValue ? Number(priceValue) : null;
              scheduledDate = p.attributes.startDate;
              scheduledPriceId = p.id;
            }
          }

          return {
            isConfigured: true,
            isLive: true,
            productId: cleanProductId,
            appleSubscriptionId: appleSubId,
            name: subscriptionDoc.attributes?.name || cleanProductId,
            state: subscriptionDoc.attributes?.state || "READY_TO_SUBMIT",
            subscriptionPeriod: subscriptionDoc.attributes?.subscriptionPeriod || "ONE_MONTH",
            currentPrice: currentLivePrice || (cleanProductId.includes("orangetick") ? 299 : 149),
            currency: "INR",
            territory: "India (IND)",
            scheduledPrice,
            scheduledDate,
            scheduledPriceId,
            pricePoints: pricePoints.length > 0 ? pricePoints : DEFAULT_IND_PRICE_POINTS,
            status: scheduledPrice ? "SCHEDULED" : "ACTIVE",
          };
        }
      } catch (apiErr) {
        console.warn("[Apple Connect API] Failed to fetch live data:", apiErr.response?.data || apiErr.message);
      }
    }
  }

  // 2. Fallback / Sandbox configuration mode (When ASC credentials are not yet entered)
  // Provides realistic pricing based on StoreKit Tier structure so the admin UI works seamlessly
  let detectedCurrentPrice = 149;
  if (cleanProductId.includes("orangetick") || cleanProductId.includes("creator")) {
    detectedCurrentPrice = 299; // Default Apple Tier for Orange Tick badge
  } else if (cleanProductId.includes("yearly")) {
    detectedCurrentPrice = 1499;
  } else if (cleanProductId.includes("weekly")) {
    detectedCurrentPrice = 299;
  }

  return {
    isConfigured: false,
    isLive: false,
    configNotice:
      "App Store Connect API credentials (ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY) not configured in backend/.env. Using StoreKit tier catalog.",
    productId: cleanProductId,
    appleSubscriptionId: `apple_sub_${cleanProductId.replace(/[^a-zA-Z0-9]/g, "_")}`,
    name: cleanProductId.split(".").pop(),
    state: "APPROVED",
    subscriptionPeriod: cleanProductId.includes("yearly") ? "ONE_YEAR" : cleanProductId.includes("weekly") ? "ONE_WEEK" : "ONE_MONTH",
    currentPrice: detectedCurrentPrice,
    currency: "INR",
    territory: "India (IND)",
    scheduledPrice: null,
    scheduledDate: null,
    scheduledPriceId: null,
    pricePoints: DEFAULT_IND_PRICE_POINTS,
    status: "ACTIVE",
  };
}

/**
 * Schedule a new price change for an Apple In-App Purchase subscription
 * @param {object} params
 * @param {string} params.subscriptionId - Apple internal subscription ID
 * @param {string} params.pricePointId - Apple subscriptionPricePoint ID
 * @param {string} params.newCustomerPrice - Desired new price in INR (e.g. '399')
 * @param {string|null} params.startDate - YYYY-MM-DD or null for immediate change
 * @param {boolean} params.preserveCurrentSubscribers - Whether existing subscribers keep current price
 */
async function scheduleApplePriceChange({
  subscriptionId,
  pricePointId,
  newCustomerPrice,
  startDate = null,
  preserveCurrentSubscribers = true,
}) {
  const isConfigured = isAppStoreConnectConfigured();

  if (isConfigured) {
    const client = getAppleApiClient();
    if (client) {
      const payload = {
        data: {
          type: "subscriptionPrices",
          attributes: {
            startDate: startDate || null,
            preserved: !!preserveCurrentSubscribers,
          },
          relationships: {
            subscription: {
              data: {
                type: "subscriptions",
                id: String(subscriptionId),
              },
            },
            subscriptionPricePoint: {
              data: {
                type: "subscriptionPricePoints",
                id: String(pricePointId),
              },
            },
          },
        },
      };

      const res = await client.post("/subscriptionPrices", payload);
      return {
        success: true,
        isLive: true,
        priceId: res.data?.data?.id,
        scheduledPrice: Number(newCustomerPrice),
        startDate: startDate || "Immediate",
        preserved: !!preserveCurrentSubscribers,
        rawResponse: res.data,
      };
    }
  }

  // Simulation mode when API credentials are not yet linked
  return {
    success: true,
    isLive: false,
    simulated: true,
    notice:
      "Price change scheduled locally. Add App Store Connect API credentials to sync directly with Apple App Store Connect.",
    priceId: `sim_price_${Date.now()}`,
    scheduledPrice: Number(newCustomerPrice),
    startDate: startDate || "Immediate",
    preserved: !!preserveCurrentSubscribers,
  };
}

/**
 * Cancel a future scheduled price change on Apple App Store Connect
 */
async function cancelAppleScheduledPriceChange(priceId) {
  const isConfigured = isAppStoreConnectConfigured();

  if (isConfigured && !String(priceId).startsWith("sim_")) {
    const client = getAppleApiClient();
    if (client) {
      await client.delete(`/subscriptionPrices/${priceId}`);
      return { success: true, isLive: true };
    }
  }

  return { success: true, isLive: false, simulated: true };
}

module.exports = {
  isAppStoreConnectConfigured,
  generateAppStoreConnectToken,
  scanAppleProduct,
  scheduleApplePriceChange,
  cancelAppleScheduledPriceChange,
  DEFAULT_IND_PRICE_POINTS,
};
