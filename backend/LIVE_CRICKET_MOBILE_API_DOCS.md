# CatchWatch – Live Cricket REST API Documentation (Flutter & iOS)
**Version:** 2.0 (Clean Architecture / Single Data Ownership)  
**Target:** Flutter (Android & iOS) / Swift iOS / React Web  
**Base URL:**
```
http://<YOUR_SERVER_IP>:5000/api/live-matches
```
*(Local testing example: `http://192.168.1.26:5000/api/live-matches`)*

---

## 🚀 Architectural Design: Single Data Ownership
In this refactored design, **every endpoint has a single, clear responsibility**. No duplicate or overlapping data is transferred:

| Screen / Component | What Endpoint to Call | When & How Often |
|---|---|---|
| **Home / Match Listings** | `GET /api/live-matches` | When listing screen loads or user applies filters (`status`, `format`). |
| **Top Hero Banner** | `GET /api/live-matches/featured` | Once on home screen load for the featured match card. |
| **Live Match Screen Open** | `GET /api/live-matches/:matchId` | **Called ONCE** on player screen open (sets up video player, streamUrl, teams, status). |
| **Live Crease Polling** | `GET /api/live-matches/:matchId/live-activity` | ⚡ **Polled every 3–5 seconds** (ultra-lightweight <500 bytes: scores, striker, non-striker, bowler, recent balls). |
| **Scorecard Tab** | `GET /api/live-matches/:matchId/scorecard` | Only when user taps the "Scorecard" tab. |
| **Commentary Tab** | `GET /api/live-matches/:matchId/commentary?limit=30` | Only when user taps the "Commentary" tab. |
| **Playing XI / Squads Tab** | `GET /api/live-matches/:matchId/squads` | Only when user taps the "Playing XI" tab. |
| **Viewer Heartbeat** | `POST /api/live-matches/:matchId/view` | When playback starts or every 60s to maintain viewer counts. |

---

## 📌 Summary of All 11 Endpoints

| # | Method | Endpoint | Responsibility & Removed Redundant Data |
|---|---|---|---|
| 1 | `GET` | `/api/live-matches` | Match Listings only. *(Removed: streamUrl, squads, scorecard, commentary, liveCrease)* |
| 2 | `GET` | `/api/live-matches/featured` | Top Featured Match for hero carousel + `streamThumbnailUrl`. |
| 3 | `GET` | `/api/live-matches/live-now` | Shortcut for `status=LIVE` listings. |
| 4 | `GET` | `/api/live-matches/upcoming` | Shortcut for `status=UPCOMING` listings. |
| 5 | `GET` | `/api/live-matches/completed` | Shortcut for `status=COMPLETED` listings with match `result`. |
| 6 | `GET` | `/api/live-matches/:matchId` | Full Match Screen Init (Called **ONCE** on screen open). *(Removed: liveCrease, squads, scorecard, commentary)* |
| 7 | `POST` | `/api/live-matches/:matchId/view` | Viewer Count Heartbeat (`{ success: true, viewerCount: Number }`). |
| 8 | `GET` | `/api/live-matches/:matchId/live-activity` | ⚡ **Ultra-lightweight Crease Polling (every 3-5s)**: scores, CRR, RRR, target, striker, non-striker, bowler, recentBalls, overStatusText. |
| 9 | `GET` | `/api/live-matches/:matchId/scorecard` | Scorecard Tab: Innings 1 & 2 Batting, Bowling, Extras, Fall of Wickets. |
| 10 | `GET` | `/api/live-matches/:matchId/commentary?limit=30` | Commentary Tab: Ball-by-ball text, boundaries, wickets. |
| 11 | `GET` | `/api/live-matches/:matchId/squads` | Squads Tab: Team A & B rosters with Captain and Wicketkeeper tags. |

---

## 1️⃣ Match Listings & Shortcuts

### `GET /api/live-matches`
Fetches match listings with stats badges (`live`, `upcoming`, `completed`, `total`).

**Query Parameters:**
- `status` *(optional)*: `ALL` | `LIVE` | `UPCOMING` | `COMPLETED` (default: `ALL`)
- `format` *(optional)*: `ALL` | `T20` | `ODI` | `TEST` | `LEAGUE`
- `tournament` *(optional)*: Filter by tournament name (regex search)
- `limit` *(optional)*: Number of items (default: `50`, max `100`)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "stats": {
    "live": 1,
    "upcoming": 1,
    "completed": 0,
    "total": 2
  },
  "matches": [
    {
      "matchId": "6afadf21ddb6e82a903d8be0",
      "_id": "6afadf21ddb6e82a903d8be0",
      "title": "England vs South Africa - 1st ODI",
      "status": "LIVE",
      "isLive": true,
      "format": "ODI",
      "matchFormat": "ODI",
      "tournament": "ODI Bilateral Series 2026",
      "startTime": "2026-11-19T08:00:00.000Z",
      "teamA": {
        "name": "England",
        "shortName": "ENG",
        "flagUrl": "https://example.com/eng.png",
        "score": "224/8 (50 ov)",
        "runs": 224,
        "wickets": 8,
        "overs": 50
      },
      "teamB": {
        "name": "South Africa",
        "shortName": "SA",
        "flagUrl": "https://example.com/sa.png",
        "score": "50/1 (3.1 ov)",
        "runs": 50,
        "wickets": 1,
        "overs": 3.1
      },
      "banner": "https://catchandwatchzone.b-cdn.net/banners/cricket1.jpg",
      "streamThumbnailUrl": "https://catchandwatchzone.b-cdn.net/banners/cricket1.jpg",
      "result": "",
      "currentStatusText": "South Africa need 175 runs in 46.5 ov",
      "isFeatured": true,
      "viewersCount": 29
    }
  ]
}
```

---

### `GET /api/live-matches/featured`
Returns the single top LIVE or upcoming featured match for Hero Carousels / Featured cards.

**Response:**
```json
{
  "success": true,
  "match": {
    "matchId": "6afadf21ddb6e82a903d8be0",
    "_id": "6afadf21ddb6e82a903d8be0",
    "title": "England vs South Africa - 1st ODI",
    "status": "LIVE",
    "isLive": true,
    "format": "ODI",
    "tournament": "ODI Bilateral Series 2026",
    "startTime": "2026-11-19T08:00:00.000Z",
    "teamA": {
      "name": "England",
      "shortName": "ENG",
      "flagUrl": "https://example.com/eng.png",
      "score": "224/8 (50 ov)",
      "runs": 224,
      "wickets": 8,
      "overs": 50
    },
    "teamB": {
      "name": "South Africa",
      "shortName": "SA",
      "flagUrl": "https://example.com/sa.png",
      "score": "50/1 (3.1 ov)",
      "runs": 50,
      "wickets": 1,
      "overs": 3.1
    },
    "result": "",
    "isFeatured": true,
    "streamThumbnailUrl": "https://catchandwatchzone.b-cdn.net/banners/cricket1.jpg",
    "viewersCount": 29
  }
}
```

---

### `GET /api/live-matches/live-now`
Shortcut for live matches only. Same payload schema as `/api/live-matches`.

### `GET /api/live-matches/upcoming`
Shortcut for upcoming matches only. Same payload schema as `/api/live-matches`.

### `GET /api/live-matches/completed`
Shortcut for completed matches. Returns listing fields + `result` string (e.g. `"South Africa won by 5 wickets"`).

---

## 2️⃣ Live Match Screen (Called Once on Screen Open)

### `GET /api/live-matches/:matchId`
⚠️ **Call this ONCE when opening the player screen.**  
Returns video stream URLs (`streamUrl`, `backupStreamUrl`, `streamType`), teams, venue, start/end time, toss, and current status.

*(Deep tab data like liveCrease, scorecard, commentary, and squads have been moved to their respective endpoints to prevent massive payloads and slow page loads).*

**Response:**
```json
{
  "success": true,
  "match": {
    "matchId": "6afadf21ddb6e82a903d8be0",
    "_id": "6afadf21ddb6e82a903d8be0",
    "title": "England vs South Africa - 1st ODI",
    "status": "LIVE",
    "isLive": true,
    "format": "ODI",
    "matchFormat": "ODI",
    "tournament": "ODI Bilateral Series 2026",
    "venue": "Lord's Cricket Ground, London",
    "startTime": "2026-11-19T08:00:00.000Z",
    "endTime": "2026-11-19T16:00:00.000Z",
    "teamA": {
      "name": "England",
      "shortName": "ENG",
      "flagUrl": "https://example.com/eng.png",
      "score": "224/8 (50 ov)",
      "runs": 224,
      "wickets": 8,
      "overs": 50
    },
    "teamB": {
      "name": "South Africa",
      "shortName": "SA",
      "flagUrl": "https://example.com/sa.png",
      "score": "50/1 (3.1 ov)",
      "runs": 50,
      "wickets": 1,
      "overs": 3.1
    },
    "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "backupStreamUrl": "https://test-streams.mux.dev/x36xhzz/backup.m3u8",
    "streamType": "hls",
    "streamThumbnailUrl": "https://catchandwatchzone.b-cdn.net/banners/cricket1.jpg",
    "result": "",
    "currentStatusText": "South Africa need 175 runs in 46.5 ov",
    "isFeatured": true,
    "isPremium": false,
    "viewersCount": 29,
    "toss": "South Africa won the toss and elected to bowl",
    "currentInnings": 2,
    "battingTeam": "team2",
    "bowlingTeam": "team1"
  }
}
```

---

### `POST /api/live-matches/:matchId/view`
Heartbeat endpoint to increment and retrieve the live viewer count. Call when stream starts and optionally every 60s.

**Response:**
```json
{
  "success": true,
  "viewerCount": 30,
  "viewersCount": 30
}
```

---

## 3️⃣ High-Frequency Polling & Tabs

### ⚡ `GET /api/live-matches/:matchId/live-activity` (Poll Every 3-5s)
⚡ **Super Lightweight (~400 bytes)**  
This is the **only** endpoint that the Flutter/iOS app should poll in a background timer (every 3 to 5 seconds) while the user is watching the live match.

It returns strictly changing live crease values:
- Real-time team scores
- CRR, RRR, Target
- Striker: name, runs, balls, 4s, 6s, SR
- Non-Striker: name, runs, balls, 4s, 6s, SR
- Current Bowler: name, overs, maidens, runs, wickets, economy
- Recent balls array (e.g. `["1b", "Wd", "6", "W", "4"]`)
- `overStatusText` & `lastUpdated`

**Response:**
```json
{
  "success": true,
  "matchId": "6afadf21ddb6e82a903d8be0",
  "status": "LIVE",
  "isLive": true,
  "scores": {
    "teamA": {
      "name": "England",
      "shortName": "ENG",
      "score": "224/8 (50 ov)",
      "runs": 224,
      "wickets": 8,
      "overs": 50
    },
    "teamB": {
      "name": "South Africa",
      "shortName": "SA",
      "score": "50/1 (3.1 ov)",
      "runs": 50,
      "wickets": 1,
      "overs": 3.1
    },
    "team1": "224/8 (50 ov)",
    "team2": "50/1 (3.1 ov)"
  },
  "currentInnings": 2,
  "battingTeam": "team2",
  "bowlingTeam": "team1",
  "CRR": "15.79",
  "RRR": "3.84",
  "target": 225,
  "striker": {
    "name": "Jonny Bairstow",
    "runs": 36,
    "balls": 7,
    "fours": 3,
    "sixes": 4,
    "SR": 514.3
  },
  "nonStriker": {
    "name": "Quinton de Kock",
    "runs": 5,
    "balls": 4,
    "fours": 0,
    "sixes": 0,
    "SR": 125.0
  },
  "bowler": {
    "name": "David Miller",
    "overs": 0.5,
    "maidens": 0,
    "runs": 27,
    "wickets": 0,
    "economy": 32.4
  },
  "recentBalls": ["1b", "Wd", "6", "W", "4", "6", "1", "2", "4", "4", "Nb", "6", "6", "6"],
  "currentOverBalls": ["4", "4", "Nb", "6", "6", "6"],
  "overStatusText": "South Africa need 175 runs in 46.5 ov",
  "lastUpdated": "2026-11-25T06:50:00.000Z"
}
```

---

### `GET /api/live-matches/:matchId/scorecard`
Call only when the user taps on the **Scorecard** tab. Returns complete Innings 1 and Innings 2 batting cards, bowling figures, extras, and fall of wickets (FOW).

**Response:**
```json
{
  "success": true,
  "matchId": "6afadf21ddb6e82a903d8be0",
  "status": "LIVE",
  "currentInnings": 2,
  "battingTeam": "team2",
  "bowlingTeam": "team1",
  "target": 225,
  "crr": "15.79",
  "rrr": "3.84",
  "innings1": {
    "teamName": "England",
    "score": "224/8 (50 ov)",
    "totalRuns": 224,
    "wickets": 8,
    "overs": 50,
    "extras": {
      "wides": 4,
      "noBalls": 1,
      "byes": 2,
      "legByes": 3,
      "penalty": 0,
      "total": 10
    },
    "batting": [
      {
        "playerName": "Jonny Bairstow",
        "name": "Jonny Bairstow",
        "runs": 86,
        "balls": 72,
        "fours": 9,
        "sixes": 3,
        "strikeRate": 119.44,
        "SR": 119.44,
        "dismissalText": "c De Kock b Rabada",
        "isOut": true
      }
    ],
    "bowling": [
      {
        "bowlerName": "Kagiso Rabada",
        "name": "Kagiso Rabada",
        "overs": 10,
        "maidens": 1,
        "runsConceded": 42,
        "runs": 42,
        "wickets": 3,
        "economy": 4.2
      }
    ],
    "fallOfWickets": [
      {
        "wicketNumber": 1,
        "score": "42/1",
        "over": "7.4",
        "playerName": "Phil Salt"
      }
    ]
  },
  "innings2": {
    "teamName": "South Africa",
    "score": "50/1 (3.1 ov)",
    "totalRuns": 50,
    "wickets": 1,
    "overs": 3.1,
    "extras": {
      "wides": 1,
      "noBalls": 1,
      "byes": 1,
      "legByes": 0,
      "penalty": 0,
      "total": 3
    },
    "batting": [
      {
        "playerName": "Quinton de Kock",
        "name": "Quinton de Kock",
        "runs": 5,
        "balls": 4,
        "fours": 0,
        "sixes": 0,
        "strikeRate": 125.0,
        "SR": 125.0,
        "dismissalText": "not out",
        "isOut": false
      },
      {
        "playerName": "Reeza Hendricks",
        "name": "Reeza Hendricks",
        "runs": 0,
        "balls": 1,
        "fours": 0,
        "sixes": 0,
        "strikeRate": 0,
        "SR": 0,
        "dismissalText": "hit wicket b Reece Topley",
        "isOut": true
      },
      {
        "playerName": "Jonny Bairstow",
        "name": "Jonny Bairstow",
        "runs": 32,
        "balls": 6,
        "fours": 2,
        "sixes": 4,
        "strikeRate": 533.3,
        "SR": 533.3,
        "dismissalText": "not out",
        "isOut": false
      }
    ],
    "bowling": [
      {
        "bowlerName": "Reece Topley",
        "name": "Reece Topley",
        "overs": 1.1,
        "maidens": 0,
        "runsConceded": 20,
        "runs": 20,
        "wickets": 1,
        "economy": 17.14
      },
      {
        "bowlerName": "David Miller",
        "name": "David Miller",
        "overs": 0.4,
        "maidens": 0,
        "runsConceded": 23,
        "runs": 23,
        "wickets": 0,
        "economy": 34.5
      }
    ],
    "fallOfWickets": [
      {
        "wicketNumber": 1,
        "score": "10/1",
        "over": "1.4",
        "playerName": "Reeza Hendricks"
      }
    ]
  }
}
```

---

### `GET /api/live-matches/:matchId/commentary?limit=30`
Call only when the user taps on the **Commentary** tab.

**Query Parameters:**
- `limit` *(optional)*: Number of ball updates to return (default: `30`, max: `100`)

**Response:**
```json
{
  "success": true,
  "matchId": "6afadf21ddb6e82a903d8be0",
  "totalCount": 15,
  "limit": 30,
  "count": 2,
  "currentStatusText": "South Africa need 175 runs in 46.5 ov",
  "commentary": [
    {
      "over": "3.1",
      "ball": 1,
      "text": "David Miller to Jonny Bairstow, SIX! What a massive strike over the boundary!",
      "runs": 6,
      "isBoundary": true,
      "boundaryType": "6",
      "isSix": true,
      "isWicket": false,
      "timestamp": "2026-11-20T07:20:00.000Z"
    },
    {
      "over": "3",
      "ball": 6,
      "text": "David Miller to Jonny Bairstow, SIX! Massive hit over deep mid-wicket!",
      "runs": 6,
      "isBoundary": true,
      "boundaryType": "6",
      "isSix": true,
      "isWicket": false,
      "timestamp": "2026-11-20T07:18:00.000Z"
    }
  ]
}
```

---

### `GET /api/live-matches/:matchId/squads`
Call only when the user taps on the **Playing XI / Squads** tab.

**Response:**
```json
{
  "success": true,
  "matchId": "6afadf21ddb6e82a903d8be0",
  "title": "England vs South Africa - 1st ODI",
  "teamA": {
    "name": "England",
    "shortName": "ENG",
    "flagUrl": "https://example.com/eng.png",
    "playerCount": 11,
    "players": [
      {
        "name": "Jos Buttler",
        "role": "WICKET_KEEPER",
        "isCaptain": true,
        "isWicketKeeper": true
      },
      {
        "name": "Jonny Bairstow",
        "role": "BATSMAN",
        "isCaptain": false,
        "isWicketKeeper": false
      }
    ]
  },
  "teamB": {
    "name": "South Africa",
    "shortName": "SA",
    "flagUrl": "https://example.com/sa.png",
    "playerCount": 11,
    "players": [
      {
        "name": "Temba Bavuma",
        "role": "BATSMAN",
        "isCaptain": true,
        "isWicketKeeper": false
      },
      {
        "name": "Quinton de Kock",
        "role": "WICKET_KEEPER",
        "isCaptain": false,
        "isWicketKeeper": true
      }
    ]
  }
}
```

---

## 📱 Flutter / iOS Developer Implementation Guide

### 1. Opening a Match Screen (One-time Init)
```dart
// 1. Fetch match video player stream and details ONCE
final matchRes = await http.get(Uri.parse('$baseUrl/api/live-matches/$matchId'));
final matchData = jsonDecode(matchRes.body)['match'];

// Initialize video player with matchData['streamUrl']
// Display team names, tournament, venue, and toss
```

### 2. High-Frequency Polling Loop (Every 3–5 seconds)
```dart
// 2. Poll live activity in a Timer
Timer.periodic(const Duration(seconds: 3), (timer) async {
  if (!mounted || matchStatus != 'LIVE') {
    timer.cancel();
    return;
  }
  
  final res = await http.get(Uri.parse('$baseUrl/api/live-matches/$matchId/live-activity'));
  if (res.statusCode == 200) {
    final activity = jsonDecode(res.body);
    setState(() {
      striker = activity['striker'];
      nonStriker = activity['nonStriker'];
      bowler = activity['bowler'];
      recentBalls = activity['recentBalls'];
      teamAScore = activity['scores']['teamA'];
      teamBScore = activity['scores']['teamB'];
      crr = activity['CRR'];
      rrr = activity['RRR'];
      target = activity['target'];
    });
  }
});
```

### 3. Tab Switching
```dart
// Load tab data ONLY when the user clicks the tab
void onTabSelected(int tabIndex) async {
  if (tabIndex == 0) {
    // Scorecard Tab
    final res = await http.get(Uri.parse('$baseUrl/api/live-matches/$matchId/scorecard'));
    // render Innings 1 & 2 tables
  } else if (tabIndex == 1) {
    // Commentary Tab
    final res = await http.get(Uri.parse('$baseUrl/api/live-matches/$matchId/commentary?limit=30'));
    // render commentary feed
  } else if (tabIndex == 2) {
    // Squads Tab
    final res = await http.get(Uri.parse('$baseUrl/api/live-matches/$matchId/squads'));
    // render Playing XI
  }
}
```
