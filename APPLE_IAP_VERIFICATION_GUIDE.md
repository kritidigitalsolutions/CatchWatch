# Catch & Watch - Apple In-App Purchase (IAP) & Backend Verification Guide

> **Document Purpose**: Technical documentation and implementation guide for the iOS / Flutter app developer regarding Apple In-App Purchase (StoreKit 1 & StoreKit 2), server-side verification, transaction queue resolution, and KYC Orange Tick integration.

---

## 1. Executive Summary & Root Causes Addressed

During the Apple In-App Purchase testing and account deletion re-tests (Orange Tick badge), the backend payment architecture was updated to resolve several critical vulnerabilities and queue blocking issues:

| Issue | Previous Behavior | Fixed Behavior |
| :--- | :--- | :--- |
| **Duplicate Transaction Ownership** | Existing transactions were returned with `200 OK` regardless of which user owned them. | Strict ownership check. Same user retry = idempotent `200 OK`. Different user = `409 Conflict` (`TRANSACTION_OWNED_BY_ANOTHER_ACCOUNT`). |
| **Cryptographic Validation** | Client-supplied identifiers (`transactionId`, `productId`) were trusted in fallback without cryptographic verification. | Unsafe fallback removed. StoreKit 2 JWS token is validated via Apple leaf certificate X.509 chain, ES256 P-1363 signature, App Bundle ID, and revocation status. |
| **Unresolved Transaction (`2000001248853227`)** | Transaction remained stuck in the StoreKit transaction queue because `completePurchase()` was not finalized after failed verification. | Backend now delivers clean verification results. Complete instructions provided below for the client-side `completePurchase()` lifecycle. |
| **Account Deletion Data Loss** | User account deletion purged `Subscription` records, destroying transaction history and breaking restore reconciliation. | Hard deletion replaced with audit preservation (`status: "account_deleted"`). Previous transactions remain logged for anti-fraud and App Store compliance. |
| **KYC Auto-Linking** | Payment and KYC verification request were detached. | Once Orange Tick payment is verified, backend automatically links `paymentId` and `orderId` to any active/pending KYC `VerificationRequest`. |
| **Pricing Discrepancy (₹299 vs ₹1)** | Backend MongoDB had test price ₹1, while App Store Connect tier is set to ₹299. | Clarified architecture: Apple purchases charge and display the StoreKit localized tier (`ProductDetails.price`), independent of backend database fields. |

---

## 2. Backend Verification Endpoints

### Primary Endpoint
- **URL**: `POST https://<backend-api-domain>/api/payment/verify-apple`
- **Aliases**: `/api/payment/apple-verify`, `/api/payment/apple/verify`
- **Auth Header**: `Authorization: Bearer <user_jwt_token>`
- **Content-Type**: `application/json`

---

### Request Payload Format

#### Option A: StoreKit 2 (Recommended for modern iOS / Flutter)
Send Apple's signed transaction JWS token (`verificationData.serverVerificationData` or `jwsRepresentation`):

```json
{
  "serverVerificationData": "<BASE64_JWS_STRING_WITH_TWO_DOTS>",
  "productId": "com.app.catchWatch.sub.creator.orangetick",
  "transactionId": "2000001248853227",
  "originalTransactionId": "2000001248847015",
  "planId": "6ac63a81cc618e6d7060fef8"
}
```

> **Note**: Even if `productId` or `transactionId` are sent by the client, the backend extracts and trusts **only** the cryptographically decoded fields from `serverVerificationData`.

#### Option B: StoreKit 1 (Legacy App Store Receipt)
Send the base64-encoded receipt string from `Bundle.main.appStoreReceiptURL`:

```json
{
  "receiptData": "<BASE64_ENCODED_APP_STORE_RECEIPT>",
  "productId": "com.app.catchWatch.sub.creator.orangetick"
}
```

---

### Backend Responses

#### 1. Success (`200 OK`)
Returned for a new valid purchase or an idempotent retry by the **same** authenticated user:

```json
{
  "success": true,
  "message": "Apple payment verified successfully",
  "subscription": {
    "_id": "6ac9dead3446d55dfbec3af1",
    "user": "6ac9de163446d55dfbec3aed",
    "plan": "6ac63a81cc618e6d7060fef8",
    "status": "active",
    "paymentId": "2000001248853227",
    "subscriptionId": "2000001248847015",
    "amount": 1,
    "currency": "INR",
    "startDate": "2026-10-10T07:15:00.000Z",
    "endDate": "2026-11-09T07:15:00.000Z"
  },
  "verification": {
    "transactionId": "2000001248853227",
    "originalTransactionId": "2000001248847015",
    "productId": "com.app.catchWatch.sub.creator.orangetick",
    "environment": "Sandbox"
  }
}
```

#### 2. Ownership Conflict (`409 Conflict`)
Returned when an Apple transaction or original subscription was already verified and claimed by **another user account**:

```json
{
  "success": false,
  "code": "TRANSACTION_OWNED_BY_ANOTHER_ACCOUNT",
  "message": "This Apple transaction is already associated with another Catch & Watch account. Cross-account transfer is not permitted."
}
```

#### 3. Cryptographic Verification Failure (`400 Bad Request`)
Returned if signature is forged, token is altered, or bundle ID does not match `com.app.catchWatch`:

```json
{
  "success": false,
  "message": "Apple purchase verification failed: StoreKit 2 signature or certificate chain verification failed"
}
```

#### 4. Product Mismatch (`400 Bad Request`)
Returned if the client requests Plan A but verified Apple receipt is for Plan B:

```json
{
  "success": false,
  "message": "Requested plan appleProductId does not match verified Apple product ID."
}
```

---

## 3. Required Flutter / iOS Client Lifecycle (Crucial for StoreKit)

### The Unresolved Transaction Issue Explained
In Apple StoreKit, whenever a transaction enters the queue, it remains in the device's transaction queue **until the app explicitly finishes it**:
```dart
InAppPurchase.instance.completePurchase(purchaseDetails);
```

If the app fails to call `completePurchase()` (for example, if backend returned an error, or the app crashed, or the code was waiting for an order creation that was blocked), StoreKit will **replay that same transaction on every app launch and on every purchase attempt**.

If your Flutter code sets a boolean flag such as `_isPurchasePending = true` and fails to clear it, any new purchase tap is blocked before order creation.

---

### Recommended Flutter Implementation Pattern

```dart
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class PaymentService {
  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;
  bool isProcessing = false;

  void initializePurchaseStream(String authToken) {
    final purchaseUpdated = _iap.purchaseStream;
    _subscription = purchaseUpdated.listen(
      (purchaseDetailsList) {
        _handlePurchaseUpdates(purchaseDetailsList, authToken);
      },
      onDone: () => _subscription?.cancel(),
      onError: (error) {
        debugPrint("[StoreKit] Purchase Stream error: $error");
        isProcessing = false;
      },
    );
  }

  Future<void> _handlePurchaseUpdates(
    List<PurchaseDetails> purchaseDetailsList,
    String authToken,
  ) async {
    for (var purchaseDetails in purchaseDetailsList) {
      debugPrint("[StoreKit] Processing purchase: ${purchaseDetails.productID}, status: ${purchaseDetails.status}, txId: ${purchaseDetails.purchaseID}");

      if (purchaseDetails.status == PurchaseStatus.pending) {
        // Transaction is being confirmed by Apple UI
        isProcessing = true;
        continue;
      }

      if (purchaseDetails.status == PurchaseStatus.error) {
        debugPrint("[StoreKit] Apple purchase error: ${purchaseDetails.error}");
        isProcessing = false;
        // Always finish failed/cancelled transactions so they don't block the queue
        if (purchaseDetails.pendingCompletePurchase) {
          await _iap.completePurchase(purchaseDetails);
        }
        continue;
      }

      if (purchaseDetails.status == PurchaseStatus.purchased ||
          purchaseDetails.status == PurchaseStatus.restored) {
        
        // 1. Send receipt/JWS to Backend for verification
        final bool verified = await _verifyWithBackend(purchaseDetails, authToken);

        // 2. ONLY complete the purchase once handled (or if permanently rejected with 409)
        if (purchaseDetails.pendingCompletePurchase) {
          if (verified) {
            await _iap.completePurchase(purchaseDetails);
            debugPrint("[StoreKit] Purchase successfully verified and completed: ${purchaseDetails.purchaseID}");
          }
        }
        isProcessing = false;
      }
    }
  }

  Future<bool> _verifyWithBackend(
    PurchaseDetails purchase,
    String authToken,
  ) async {
    try {
      final url = Uri.parse("https://<YOUR_API_DOMAIN>/api/payment/verify-apple");
      
      final response = await http.post(
        url,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $authToken",
        },
        body: jsonEncode({
          "serverVerificationData": purchase.verificationData.serverVerificationData,
          "productId": purchase.productID,
          "transactionId": purchase.purchaseID ?? "",
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data["success"] == true) {
        // Payment verified! Entitlement activated on backend.
        return true;
      } else if (response.statusCode == 409) {
        // Transaction is owned by another account
        debugPrint("[StoreKit] Conflict: ${data['message']}");
        // Complete the purchase to remove it from this device's queue, but notify user
        if (purchase.pendingCompletePurchase) {
          await _iap.completePurchase(purchase);
        }
        return false;
      } else {
        debugPrint("[StoreKit] Backend verification error: ${data['message']}");
        return false;
      }
    } catch (e) {
      debugPrint("[StoreKit] Network / verification error: $e");
      return false; // Leave in queue to retry when online
    }
  }

  void dispose() {
    _subscription?.cancel();
  }
}
```

---

## 4. Orange Tick KYC Flow Sequencing

Once the Apple payment is verified:
1. The backend automatically saves an active `Subscription` record with:
   - `paymentId`: verified Apple `transactionId` (e.g. `2000001248853227`)
   - `subscriptionId`: verified Apple `originalTransactionId` (e.g. `2000001248847015`)
2. In the KYC submission endpoint (`POST /api/verification/apply`):
   - You can pass `paymentId: purchase.purchaseID` in the request body.
   - Even if `paymentId` is omitted, the backend **automatically links the user's active Orange Tick subscription** to the `VerificationRequest`.
3. If an existing pending KYC request already exists when the payment is verified, the backend immediately attaches the `paymentId` and plan details to that pending request.

---

## 5. Apple Product Configurations & Pricing Reference

| Field | Production Value | Sandbox / Developer Notes |
| :--- | :--- | :--- |
| **App Bundle ID** | `com.app.catchWatch` | Must match in Xcode and StoreKit 2 payload `bundleId`. |
| **Orange Tick Product ID** | `com.app.catchWatch.sub.creator.orangetick` | Auto-Renewable Subscription. |
| **Monthly Premium Plan** | `com.app.catchWatch.sub.premium.monthly` | Video streaming monthly subscription. |
| **Yearly Premium Plan** | `com.app.catchWatch.sub.premium.yearly` | Video streaming yearly subscription. |
| **Weekly Premium Plan** | `com.app.catchWatch.sub.premium.weekly` | Video streaming weekly subscription. |

### Note on Pricing Display
- StoreKit displays prices defined in **App Store Connect** (e.g., Tier 3 / Tier 4 = ₹299.00 in India).
- Razorpay / Web charges backend prices from MongoDB (e.g., ₹1 test price).
- **Rule for iOS**: Always display `ProductDetails.price` (the formatted localized currency string returned by Apple StoreKit) on the iOS KYC and subscription buttons.

---

## 6. Testing Checklist for iOS Sandbox

1. **Clean Test User**:
   - In App Store Connect, go to **Users and Access > Sandbox Testers**.
   - Use a dedicated Sandbox tester Apple ID.
2. **First-Time Purchase**:
   - Sign in with Sandbox Apple ID.
   - Tap "Get Orange Tick" -> Complete Apple purchase prompt.
   - Verify that backend returns `200 OK` and `InAppPurchase.instance.completePurchase()` is called.
3. **Queue Replay Test**:
   - Restart the app.
   - Verify that no stuck transaction blocks the UI and that `isPurchasePending` is `false`.
4. **Duplicate Ownership Test**:
   - Log out of Catch & Watch and log in with a **different Catch & Watch user account**.
   - Attempt to verify or restore using the same Sandbox Apple ID.
   - Confirm backend returns `409 Conflict` with `TRANSACTION_OWNED_BY_ANOTHER_ACCOUNT`.
5. **Account Deletion Test**:
   - Go to Profile Settings -> Delete Account.
   - Re-register with the same phone number.
   - Verify that backend preserved the audit record without crashing or duplicating.

---

## 7. Admin Panel: Apple In-App Purchase Pricing Management & Scheduling

As per Apple's App Store Connect API guidelines ([Schedule Price Changes for In-App Purchases](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/schedule-price-changes-for-in-app-purchases)), the Admin Panel (`frontend/src/pages/Plans.jsx`) and Backend (`backend/controllers/admin/plan.controller.js`) now feature complete In-App Purchase price discovery, matching, and scheduling.

### Features Added in Admin Panel:

1. **🔍 Scan & Match Apple IAP in Plan Creation / Edit Form**:
   - When entering or editing `appleProductId` (e.g. `com.app.catchWatch.sub.creator.orangetick`), admin clicks **"🔍 Scan Apple IAP"**.
   - The backend queries Apple App Store Connect to verify the subscription, fetch its internal Apple Subscription ID, live customer price (e.g. ₹299), and live state.
   - If there is a price mismatch between the backend form price and Apple's customer price, an alert is displayed with a **"🔄 Auto-fill Form Price to ₹299"** button to guarantee 100% price alignment before saving.

2. **📊 Plan Table Live Match Indicators**:
   - Displays both **Backend Price** and **Apple Live Price** side by side.
   - Status badge shows:
     - `✓ Matched`: When backend and Apple prices are identical.
     - `⚠️ Mismatch`: Displays difference with a 1-click **"Sync"** button to align backend with Apple.
     - `🕒 Scheduled: ₹399 (YYYY-MM-DD)`: Shows pending scheduled future price changes.

3. **🍎 Dedicated "Manage Apple IAP Pricing" Modal**:
   - Clicking the **`$`** button on any plan opens the Apple StoreKit Pricing Management dashboard:
     - **Pricing Comparison**: Backend Price vs Apple Live Price vs Territory (`India - IND`).
     - **1-Click Sync**: Updates backend plan price to Apple's live customer price in one click.
     - **Scheduled Price Changes**: Displays currently scheduled price changes and allows 1-click cancellation (`Cancel Scheduled Change`).
     - **Schedule New Price Change Form**:
       - Select new target price from Apple India Tier Price Points (e.g. ₹49, ₹99, ₹149, ₹199, ₹249, ₹299, ₹349, ₹399, ₹449, ₹499, ₹599, ₹699, ₹799, ₹899, ₹999, ₹1499, ₹1999). Shows customer price + developer proceeds.
       - Effective Date: Choose "Immediate (startDate: null)" or a specific calendar start date (`YYYY-MM-DD`).
       - Grandfathering Checkbox: `[x] Preserve current price for existing subscribers` (Apple recommended).
       - Live confirmation review before submitting to Apple.

---

## 8. Backend App Store Connect API Configuration

The backend helper ([appStoreConnect.helper.js](file:///d:/In%20Progress%20Projects/CatchWatch/backend/utils/appStoreConnect.helper.js)) supports both live Apple API communication and an intelligent fallback StoreKit catalog mode:

### Environment Variables in `backend/.env`:

```env
# Apple App Store Connect API Credentials (For Price Scheduling & Discovery)
ASC_ISSUER_ID=your_apple_issuer_id
ASC_KEY_ID=your_apple_key_id
ASC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# Or file path:
ASC_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APPLE_APP_ID=your_numeric_apple_app_id
```

### Admin Endpoints Implemented:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/admin/plan/apple/scan` | Scans Apple product, fetches live price, internal subscription ID, and India price points. |
| `POST` | `/api/admin/plan/:id/apple-price/schedule` | Schedules a new customer price change on Apple (`POST /v1/subscriptionPrices`). |
| `DELETE` | `/api/admin/plan/:id/apple-price/cancel` | Cancels a future scheduled price change (`DELETE /v1/subscriptionPrices/{id}`). |
| `POST` | `/api/admin/plan/:id/sync-price-from-apple` | 1-Click syncs backend plan price to match Apple's live customer price. |

