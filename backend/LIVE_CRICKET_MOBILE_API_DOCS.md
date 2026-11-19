# CatchWatch – Live Cricket REST API Documentation (Flutter & iOS)

This document contains all user-facing APIs for **Live Cricket Streaming, Live Scorecard, Crease Activity (Striker/Non-Striker/Bowler), Commentary, and Playing XI Squads**.

Any ball or score update made by the Admin Console will instantly reflect in these APIs.

---

## 🌐 Base URL
```
http://<YOUR_SERVER_IP>:5000/api/live-matches
```
*(For local network testing, e.g., `http://192.168.1.26:5000/api/live-matches`)*

---

## 📌 Summary of Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Listing** | `GET` | `/api/live-matches` | List matches with stats counts (`live`, `upcoming`, `completed`) & filters (`status`, `format`, `tournament`). |
| **Listing** | `GET` | `/api/live-matches/featured` | Top featured match for App Home Banner / Hero carousel. |
| **Listing** | `GET` | `/api/live-matches/live-now` | Direct shortcut for matches currently **LIVE**. |
| **Listing** | `GET` | `/api/live-matches/upcoming` | Direct shortcut for **UPCOMING** fixtures. |
| **Listing** | `GET` | `/api/live-matches/completed` | Direct shortcut for **COMPLETED** matches with results. |
| **Match Stream** | `GET` | `/api/live-matches/:id` | Full match details (Video Player Stream URL, Teams, Crease, Squads, Scorecard). Call once when opening screen. |
| **Live Polling** | `GET` | `/api/live-matches/:id/live-activity` | ⚡ **Lightweight Polling (Every 3–5s)**: Returns live scores, CRR, RRR, Target, Striker, Non-Striker, Bowler, and Recent Balls. |
| **Tabs** | `GET` | `/api/live-matches/:id/scorecard` | **Scorecard Tab**: Innings 1 & 2 Batting tables, Bowling figures, Extras & Fall of Wickets. |
| **Tabs** | `GET` | `/api/live-matches/:id/commentary?limit=30` | **Commentary Tab**: Ball-by-ball updates (boundaries, wickets, text). |
| **Tabs** | `GET` | `/api/live-matches/:id/squads` | **Playing XI Tab**: 11 vs 11 Squads with Captain & Wicketkeeper tags. |
| **Heartbeat** | `POST` | `/api/live-matches/:id/view` | Ping live viewer heartbeat / increment viewer count. |

---

## 1️⃣ Match Listings & Banner

### `GET /api/live-matches`
Fetch cricket matches with live/upcoming/completed count badges.

**Query Parameters:**
- `status` *(optional)*: `ALL` | `LIVE` | `UPCOMING` | `COMPLETED` (default: `ALL`)
- `format` *(optional)*: `ALL` | `T20` | `ODI` | `TEST` | `LEAGUE`
- `tournament` *(optional)*: Tournament name search (e.g. `ICC T20 World Cup`)
- `limit` *(optional)*: Number of items (default: `50`, max `100`)

**Sample Response:**
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
      "_id": "6afadf21ddb6e82a903d8be0",
      "title": "England vs South Africa - 1st ODI",
      "tournament": "ODI Bilateral Series 2026",
      "matchFormat": "ODI",
      "status": "LIVE",
      "isLive": true,
      "currentStatusText": "South Africa need 180 runs to win",
      "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      "streamType": "hls",
      "banner": "https://example.com/banner.jpg",
      "venue": "Lord's Cricket Ground, London",
      "startTime": "2026-11-19T08:00:00.000Z",
      "viewersCount": 29,
      "team1": {
        "name": "England",
        "shortName": "ENG",
        "logo": "https://example.com/eng.png",
        "score": "224/8 (50 ov)"
      },
      "team2": {
        "name": "South Africa",
        "shortName": "SA",
        "logo": "https://example.com/sa.png",
        "score": "50/1 (3.1 ov)"
      },
      "currentInnings": 2,
      "battingTeam": "team2",
      "bowlingTeam": "team1",
      "crr": "15.79",
      "rrr": "3.84",
      "target": 225,
      "striker": {
        "name": "Jonny Bairstow",
        "runs": 36,
        "balls": 7,
        "fours": 3,
        "sixes": 4,
        "strikeRate": 514.3
      },
      "nonStriker": {
        "name": "Quinton de Kock",
        "runs": 5,
        "balls": 4,
        "fours": 0,
        "sixes": 0,
        "strikeRate": 125.0
      },
      "currentBowler": {
        "name": "David Miller",
        "overs": 0.5,
        "maidens": 0,
        "runsConceded": 27,
        "wickets": 0,
        "economy": 32.4
      },
      "recentBalls": ["1b", "Wd", "6", "W", "4", "6", "1", "2", "4", "4", "Nb", "6", "6", "6"]
    }
  ]
}
```

---

### `GET /api/live-matches/featured`
Returns the single top LIVE or upcoming featured match for Hero Carousels / Featured cards.

```json
{
  "success": true,
  "match": {
    "_id": "6afadf21ddb6e82a903d8be0",
    "title": "England vs South Africa - 1st ODI",
    "status": "LIVE",
    "isFeatured": true,
    ...
  }
}
```

---

## 2️⃣ Live Match Screen (Player & Full Details)

### `GET /api/live-matches/:id`
Call this **once** when the user taps a match card to open the live match video player screen.

**Key Data Returned:**
- `streamUrl`: The video stream link (HLS `.m3u8`, YouTube URL, or direct MP4).
- `streamType`: `hls` | `youtube` | `mp4` | `embed` | `auto`.
- `team1` & `team2`: Names, short names, flag logos, current scores, and 11-player squads.
- `striker`, `nonStriker`, `currentBowler`: Crease activity.
- `recentBalls`: Array of string outcomes for recent balls (e.g. `["0", "1", "4", "6", "W", "Wd"]`).
- `innings1` & `innings2`: Scorecards with batting tables and bowling figures.
- `commentary`: Commentary log.

---

## 3️⃣ Real-Time Polling & Tabs (Optimized for Mobile)

### ⚡ `GET /api/live-matches/:id/live-activity`
**Recommended Mobile Usage:** Poll this endpoint with a `Timer.periodic` every **3 to 5 seconds** while the user is watching.
It transfers minimal JSON data (~1 KB) to conserve mobile battery and network data.

**Sample Response:**
```json
{
  "success": true,
  "matchId": "6afadf21ddb6e82a903d8be0",
  "title": "England vs South Africa - 1st ODI",
  "status": "LIVE",
  "isLive": true,
  "currentStatusText": "David Miller to Jonny Bairstow, SIX! Massive strike over the boundary!",
  "team1": {
    "name": "England",
    "shortName": "ENG",
    "logo": "https://example.com/eng.png",
    "score": "224/8 (50 ov)"
  },
  "team2": {
    "name": "South Africa",
    "shortName": "SA",
    "logo": "https://example.com/sa.png",
    "score": "50/1 (3.1 ov)"
  },
  "currentInnings": 2,
  "battingTeam": "team2",
  "bowlingTeam": "team1",
  "target": 225,
  "crr": "15.79",
  "rrr": "3.84",
  "toss": "England won the toss and elected to bat",
  "striker": {
    "name": "Jonny Bairstow",
    "runs": 36,
    "balls": 7,
    "fours": 3,
    "sixes": 4,
    "strikeRate": 514.3
  },
  "nonStriker": {
    "name": "Quinton de Kock",
    "runs": 5,
    "balls": 4,
    "fours": 0,
    "sixes": 0,
    "strikeRate": 125.0
  },
  "currentBowler": {
    "name": "David Miller",
    "overs": 0.5,
    "maidens": 0,
    "runsConceded": 27,
    "wickets": 0,
    "economy": 32.4
  },
  "recentBalls": ["1b", "Wd", "6", "W", "4", "6", "1", "2", "4", "4", "Nb", "6", "6", "6"],
  "currentOverBalls": ["1", "2", "4", "4", "Nb", "6"],
  "viewersCount": 35,
  "timestamp": "2026-11-19T09:18:40.000Z"
}
```

---

### `GET /api/live-matches/:id/scorecard`
Use for the **Scorecard Tab**. Contains Innings 1 and Innings 2 batting tables, bowling figures, extras, and Fall of Wickets (FOW).

**Batting Table Fields:**
- `playerName` (String): e.g. "Jonny Bairstow"
- `dismissalText` (String): e.g. "not out" or "c Head b Cummins"
- `isOut` (Boolean): `false` = Not out (display `*` on crease)
- `runs`, `balls`, `fours`, `sixes`, `strikeRate`

**Bowling Table Fields:**
- `bowlerName`: e.g. "Reece Topley"
- `overs`, `maidens`, `runsConceded`, `wickets`, `economy`

---

### `GET /api/live-matches/:id/commentary?limit=30`
Use for the **Commentary Tab**. Returns the reverse-chronological ball-by-ball updates.

**Sample Commentary Item:**
```json
{
  "_id": "6afae1...",
  "over": "3.1",
  "ball": 1,
  "text": "David Miller to Jonny Bairstow, SIX! Slog sweep dispatched into the grandstand!",
  "runs": 6,
  "isBoundary": true,
  "boundaryType": "6",
  "isWicket": false,
  "timestamp": "2026-11-19T09:15:20.000Z"
}
```

---

### `GET /api/live-matches/:id/squads`
Use for the **Playing XI Tab (11 vs 11)**.

```json
{
  "success": true,
  "matchId": "6afadf21ddb6e82a903d8be0",
  "title": "England vs South Africa - 1st ODI",
  "team1": {
    "name": "England",
    "shortName": "ENG",
    "logo": "...",
    "playerCount": 11,
    "players": [
      {
        "_id": "...",
        "name": "Jos Buttler",
        "role": "WICKET_KEEPER",
        "isCaptain": true,
        "isWicketKeeper": true
      },
      {
        "_id": "...",
        "name": "Jonny Bairstow",
        "role": "BATSMAN",
        "isCaptain": false,
        "isWicketKeeper": false
      }
    ]
  },
  "team2": {
    "name": "South Africa",
    "shortName": "SA",
    "logo": "...",
    "playerCount": 11,
    "players": [...]
  }
}
```

---

### `POST /api/live-matches/:id/view`
Viewer heartbeat. Call when the player starts playing video.
```json
{
  "success": true,
  "viewersCount": 36
}
```

---

## 📱 Mobile Developer Tips (Flutter & iOS)

1. **HLS Streaming (`.m3u8`):**
   - Use Flutter's `video_player` or `chewie` package.
   - For YouTube streams, detect `streamType == 'youtube'` and embed via `youtube_player_flutter`.

2. **Striker Indicator:**
   - In scorecard batting tables, when `batter.isOut == false` and `batter.playerName == match.striker.name`, append `🏏* ON STRIKE` (highlighted in Brand Orange).

3. **Color Badging for Recent Balls (`recentBalls`):**
   - `"0"` / `"•"`: Grey
   - `"1"` / `"2"` / `"3"`: Blue
   - `"4"`: Green
   - `"6"`: Purple
   - `"W"` / `"Wkt"`: Red
   - `"Wd"` / `"Nb"`: Amber / Orange

4. **Postman File Location:**
   - File is available at:
     `backend/CatchWatch_Live_Cricket_APIs.postman_collection.json`
     and
     `CatchWatch_Live_Cricket_APIs.postman_collection.json`
