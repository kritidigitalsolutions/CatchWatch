# Catch & Watch — Flutter 1-to-1 Audio & Video Calling Integration Guide

This guide provides complete instructions for Flutter app developers to integrate **Agora RTC + Socket.IO Audio & Video Calling** with the Catch & Watch backend APIs.

---

## 1. Overview & Architecture

- **Backend Protocol**: Node.js REST APIs + Socket.IO WebSockets.
- **Media Engine**: Agora RTC Engine (`agora_rtc_engine` package in Flutter).
- **Authentication**: JWT `Authorization: Bearer <token>` header on all APIs and Socket connection.

```text
User A (Caller)                       Backend Server                      User B (Receiver)
     │                                      │                                    │
     │ ─── 1. POST /api/calls ────────────> │                                    │
     │     (type: "audio" | "video")        │ ── 2. Socket: incoming_call ─────> │ (Shows Ringing UI)
     │                                      │                                    │
     │                                      │ <── 3. POST /api/calls/:id/accept ─ │
     │ <── 4. Socket: call_accepted ─────── │                                    │
     │                                      │                                    │
     │ ─── 5. Join Agora Channel ─────────> │ <── 5. Join Agora Channel ──────── │
     │     (Using AppId, Channel & Token)   │     (Using AppId, Channel & Token) │
     │                                      │                                    │
     │ <================ 6. Real-time Audio/Video Stream ================> │
     │                                      │                                    │
     │ ─── 7. POST /api/calls/:id/end ────> │ ── 8. Socket: call_ended ────────> │
```

---

## 2. Environment & Prerequisites

Add the following Flutter packages to your `pubspec.yaml`:

```yaml
dependencies:
  agora_rtc_engine: ^6.3.0
  socket_io_client: ^2.0.3+1
  http: ^1.2.0
  permission_handler: ^11.3.0
```

Required App Permissions (`AndroidManifest.xml` & `Info.plist`):
- Microphone (`RECORD_AUDIO`)
- Camera (`CAMERA`)
- Internet (`INTERNET`, `MODIFY_AUDIO_SETTINGS`)

---

## 3. Socket.IO Event Reference

Establish connection with Socket.IO passing JWT token in `auth` or `query`:

```dart
IO.Socket socket = IO.io('https://api.catchandwatch.com', <String, dynamic>{
  'transports': ['websocket'],
  'auth': {'token': 'YOUR_JWT_TOKEN'},
});
```

### Server-to-Client Socket Events to Listen to:

| Event Name | Description | Payload Example |
| :--- | :--- | :--- |
| `incoming_call` | Received when another user calls you | `{"callId": "...", "caller": {"_id": "...", "name": "..."}, "type": "video", "channelName": "..."}` |
| `call_accepted` | Received when recipient accepts your call | `{"callId": "...", "receiverId": "...", "channelName": "..."}` |
| `call_rejected` | Received when recipient declines call | `{"callId": "...", "receiverId": "..."}` |
| `call_busy` | Received when recipient is in another call | `{"callId": "...", "message": "User is busy"}` |
| `call_cancelled` | Received when caller cancels before answer | `{"callId": "...", "callerId": "..."}` |
| `call_missed` | Received when call times out | `{"callId": "..."}` |
| `call_ended` | Received when remote user hangs up | `{"callId": "...", "endedBy": "...", "duration": 45}` |

---

## 4. API Endpoints Table

All endpoints are prefixed with `{{baseUrl}}/calls` (e.g., `https://api.catchandwatch.com/api/calls`).

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/calls` | Start a new call | `{"receiverId": "...", "type": "audio"}` |
| `GET` | `/api/calls/history` | Get paginated call history | Query: `?page=1&limit=20` |
| `GET` | `/api/calls/:callId` | Get details of a call | None |
| `POST` | `/api/calls/:callId/token` | Fetch Agora RTC token | None |
| `POST` | `/api/calls/:callId/accept` | Accept incoming call | None |
| `POST` | `/api/calls/:callId/reject` | Decline incoming call | None |
| `POST` | `/api/calls/:callId/busy` | Mark call as busy | None |
| `POST` | `/api/calls/:callId/cancel` | Cancel outgoing call | None |
| `POST` | `/api/calls/:callId/missed` | Mark call as missed | None |
| `POST` | `/api/calls/:callId/end` | Hang up active call | None |

---

## 5. JSON Request & Response Examples

### 1. Initiate Call (`POST /api/calls`)
**Request Body:**
```json
{
  "receiverId": "64c8f1a0e8d9c2001f3e4a5b",
  "type": "video"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Call initiated",
  "call": {
    "_id": "66b72a0f891a2b3c4d5e6f7a",
    "caller": "64c8f0e0e8d9c2001f3e4a50",
    "receiver": "64c8f1a0e8d9c2001f3e4a5b",
    "type": "video",
    "channelName": "cw_call_1723288123_e4a50",
    "status": "ringing",
    "createdAt": "2026-08-10T11:50:00.000Z"
  },
  "agora": {
    "token": "007eJxTYJg6...",
    "appId": "5e8f49d21e0a4fbc8a1b2c3d4e5f6a7b",
    "channelName": "cw_call_1723288123_e4a50",
    "uid": 1f3e4a50,
    "expiresAt": 1723291723
  }
}
```

### 2. Accept Call (`POST /api/calls/:callId/accept`)
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Call accepted",
  "call": {
    "_id": "66b72a0f891a2b3c4d5e6f7a",
    "status": "accepted",
    "answeredAt": "2026-08-10T11:50:05.000Z"
  },
  "agora": {
    "token": "007eJxTYJg6...",
    "appId": "5e8f49d21e0a4fbc8a1b2c3d4e5f6a7b",
    "channelName": "cw_call_1723288123_e4a50",
    "uid": 1f3e4a5b,
    "expiresAt": 1723291723
  }
}
```

### 3. End Call (`POST /api/calls/:callId/end`)
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Call ended successfully",
  "call": {
    "_id": "66b72a0f891a2b3c4d5e6f7a",
    "status": "ended",
    "endedAt": "2026-08-10T11:52:15.000Z",
    "duration": 130
  }
}
```

---

## 6. Agora Flutter SDK Workflow Sample

```dart
import 'package:agora_rtc_engine/agora_rtc_engine.dart';

RtcEngine? _engine;

Future<void> initAgoraAndJoin({
  required String appId,
  required String channelName,
  required String token,
  required int uid,
  required bool isVideo,
}) async {
  // 1. Create RtcEngine
  _engine = createAgoraRtcEngine();
  await _engine!.initialize(RtcEngineContext(appId: appId));

  // 2. Enable Video or Audio
  if (isVideo) {
    await _engine!.enableVideo();
    await _engine!.startPreview();
  } else {
    await _engine!.enableAudio();
  }

  // 3. Register Event Handlers
  _engine!.registerEventHandler(
    RtcEngineEventHandler(
      onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
        print("Remote user joined: $remoteUid");
      },
      onUserOffline: (RtcConnection connection, int remoteUid, UserOfflineReasonType reason) {
        print("Remote user offline: $remoteUid");
      },
    ),
  );

  // 4. Join Channel
  await _engine!.joinChannel(
    token: token,
    channelId: channelName,
    uid: uid,
    options: const ChannelMediaOptions(
      clientRoleType: ClientRoleType.clientRoleBroadcaster,
      channelProfile: ChannelProfileType.channelProfileCommunication,
    ),
  );
}

Future<void> leaveAgora() async {
  await _engine?.leaveChannel();
  await _engine?.release();
}
```
