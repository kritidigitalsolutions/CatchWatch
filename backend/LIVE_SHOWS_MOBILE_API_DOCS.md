# 📺 CatchWatch - Live Shows & Live Streaming Mobile API Documentation
> **For Mobile App Developers (Flutter / iOS / Android)**  
> **Feature:** Generic OTT Live Shows, Music Concerts, Podcasts, and Live Broadcast Streaming  
> **Base URL:** `http://<SERVER_IP>:5000/api` (or production: `https://api.catchandwatch.com/api`)

---

## 📌 Overview
CatchWatch now provides a dedicated **Live Shows & Live Streaming** broadcast feature separate from cricket matches.
Admin can schedule and broadcast live video streams with onboarding URLs (supporting **HLS `.m3u8`**, **YouTube Live/Video**, and **direct MP4** streams).

---

## ⚡ Summary of Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/live-shows` | Get list of all live shows with status & category filter | No (Public) |
| `GET` | `/api/live-shows/featured` | Get top featured live show (for hero banner) | No (Public) |
| `GET` | `/api/live-shows/:id` | Get full details of a specific live show for the video player | No (Public) |
| `POST` | `/api/live-shows/:id/view` | Heartbeat ping to increment viewer count | No (Public) |

---

## 1. Get Live Shows List
Fetch live shows with optional filters for status, category, search, and pagination.

- **Endpoint:** `GET /api/live-shows`
- **Query Parameters:**
  - `status`: `LIVE` | `UPCOMING` | `ENDED` | `ALL` *(default: ALL)*
  - `category`: String (e.g. `Music Concert`, `Podcast`, `Entertainment`, `Talk Show`, `Special Event`, `ALL`)
  - `search`: String (searches title, description, category, tags)
  - `page`: Number *(default: 1)*
  - `limit`: Number *(default: 20)*

### 📥 Example Request:
```http
GET /api/live-shows?status=LIVE&limit=10 HTTP/1.1
Host: api.catchandwatch.com
Content-Type: application/json
```

### 📤 Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "shows": [
      {
        "_id": "673f8b0e7c541234abcd5678",
        "title": "Grand Music Festival Live 2026",
        "description": "Watch top artists performing live in the annual CatchWatch music festival.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        "streamType": "auto",
        "resolvedStreamType": "hls",
        "youtubeVideoId": "",
        "thumbnail": "https://catchandwatchzone.b-cdn.net/live-shows/posters/music-fest.jpg",
        "banner": "https://catchandwatchzone.b-cdn.net/live-shows/banners/music-fest-wide.jpg",
        "category": "Music Concert",
        "tags": ["live", "music", "concert", "2026"],
        "status": "LIVE",
        "isLive": true,
        "scheduledStartTime": "2026-11-27T18:00:00.000Z",
        "scheduledEndTime": "2026-11-27T22:00:00.000Z",
        "isFeatured": true,
        "isPremium": false,
        "viewersCount": 1420,
        "createdAt": "2026-11-27T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "stats": {
      "total": 5,
      "live": 2,
      "upcoming": 2,
      "ended": 1
    }
  }
}
```

---

## 2. Get Top Featured Live Show
Returns the highest-priority featured live show (ideal for hero carousel or top featured card on app home screen).

- **Endpoint:** `GET /api/live-shows/featured`

### 📥 Example Request:
```http
GET /api/live-shows/featured HTTP/1.1
Host: api.catchandwatch.com
```

### 📤 Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "_id": "673f8b0e7c541234abcd5678",
    "title": "Grand Music Festival Live 2026",
    "description": "Watch top artists performing live in the annual CatchWatch music festival.",
    "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "streamType": "auto",
    "resolvedStreamType": "hls",
    "youtubeVideoId": "",
    "thumbnail": "https://catchandwatchzone.b-cdn.net/live-shows/posters/music-fest.jpg",
    "banner": "https://catchandwatchzone.b-cdn.net/live-shows/banners/music-fest-wide.jpg",
    "category": "Music Concert",
    "tags": ["live", "music"],
    "status": "LIVE",
    "isLive": true,
    "scheduledStartTime": "2026-11-27T18:00:00.000Z",
    "isFeatured": true,
    "isPremium": false,
    "viewersCount": 1420
  }
}
```
*(Note: If no show is currently active/scheduled, `data` will be `null`)*

---

## 3. Get Single Live Show Details
Called when the user taps a show to open the video player screen.

- **Endpoint:** `GET /api/live-shows/:id`

### 📥 Example Request:
```http
GET /api/live-shows/673f8b0e7c541234abcd5678 HTTP/1.1
Host: api.catchandwatch.com
```

### 📤 Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "_id": "673f8b0e7c541234abcd5678",
    "title": "Grand Music Festival Live 2026",
    "description": "Full concert live broadcast with multi-camera setup.",
    "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "backupStreamUrl": "https://backup-streams.mux.dev/live.m3u8",
    "streamType": "auto",
    "resolvedStreamType": "hls",
    "youtubeVideoId": "",
    "thumbnail": "https://catchandwatchzone.b-cdn.net/live-shows/posters/music-fest.jpg",
    "banner": "https://catchandwatchzone.b-cdn.net/live-shows/banners/music-fest-wide.jpg",
    "category": "Music Concert",
    "tags": ["music", "live"],
    "status": "LIVE",
    "isLive": true,
    "scheduledStartTime": "2026-11-27T18:00:00.000Z",
    "scheduledEndTime": "2026-11-27T22:00:00.000Z",
    "isFeatured": true,
    "isPremium": false,
    "viewersCount": 1420,
    "isActive": true,
    "createdAt": "2026-11-27T10:00:00.000Z",
    "updatedAt": "2026-11-27T12:00:00.000Z"
  }
}
```

---

## 4. Viewer Heartbeat Ping
Increments and keeps live viewer count updated.

- **Endpoint:** `POST /api/live-shows/:id/view`
- **Polling Frequency:** Ping once upon entering the screen, and periodically every **20 to 30 seconds** while the player is active.
- **Request Body:** None required.

### 📥 Example Request:
```http
POST /api/live-shows/673f8b0e7c541234abcd5678/view HTTP/1.1
Host: api.catchandwatch.com
```

### 📤 Success Response (`200 OK`):
```json
{
  "success": true,
  "viewersCount": 1421
}
```

---

## 📱 Mobile Video Player Integration Guide (Flutter)

### 1. Determining Stream Type:
Check `resolvedStreamType` or `youtubeVideoId`:
- If `resolvedStreamType == "youtube"` or `youtubeVideoId.isNotEmpty`:
  - Use `youtube_player_flutter` package with `youtubeVideoId`.
- If `resolvedStreamType == "hls"` or `.m3u8` in `streamUrl`:
  - Use `video_player` / `chewie` / `better_player` initialized with `VideoPlayerController.networkUrl(Uri.parse(streamUrl))`.
- If `resolvedStreamType == "mp4"`:
  - Standard progressive video player.

### 2. Flutter Code Example:
```dart
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

class LiveShowPlayerWidget extends StatefulWidget {
  final Map<String, dynamic> showData;
  const LiveShowPlayerWidget({Key? key, required this.showData}) : super(key: key);

  @override
  State<LiveShowPlayerWidget> createState() => _LiveShowPlayerWidgetState();
}

class _LiveShowPlayerWidgetState extends State<LiveShowPlayerWidget> {
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;
  YoutubePlayerController? _ytController;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  void _initPlayer() {
    final streamUrl = widget.showData['streamUrl'] ?? '';
    final ytId = widget.showData['youtubeVideoId'] ?? '';
    final isYouTube = (widget.showData['resolvedStreamType'] == 'youtube') || ytId.isNotEmpty;

    if (isYouTube && ytId.isNotEmpty) {
      _ytController = YoutubePlayerController(
        initialVideoId: ytId,
        flags: const YoutubePlayerFlags(
          autoPlay: true,
          isLive: true,
        ),
      );
    } else {
      _videoController = VideoPlayerController.networkUrl(Uri.parse(streamUrl))
        ..initialize().then((_) {
          _chewieController = ChewieController(
            videoPlayerController: _videoController!,
            autoPlay: true,
            isLive: widget.showData['status'] == 'LIVE',
            aspectRatio: 16 / 9,
          );
          setState(() {});
        });
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _chewieController?.dispose();
    _ytController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_ytController != null) {
      return YoutubePlayer(controller: _ytController!);
    }
    if (_chewieController != null && _chewieController!.videoPlayerController.value.isInitialized) {
      return Chewie(controller: _chewieController!);
    }
    return const AspectRatio(
      aspectRatio: 16 / 9,
      child: Center(child: CircularProgressIndicator(color: Colors.orange)),
    );
  }
}
```
