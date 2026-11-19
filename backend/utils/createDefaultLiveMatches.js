const LiveMatch = require("../models/liveMatch.model");

/**
 * Seeds a default sample live cricket match if no matches exist or enriches existing.
 */
const createDefaultLiveMatches = async () => {
  try {
    const indiaSquad = [
      { name: "Rohit Sharma", role: "BATSMAN", isCaptain: true, isWicketKeeper: false },
      { name: "Virat Kohli", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Suryakumar Yadav", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Rishabh Pant", role: "WICKET_KEEPER", isCaptain: false, isWicketKeeper: true },
      { name: "Hardik Pandya", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Ravindra Jadeja", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Axar Patel", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Kuldeep Yadav", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Jasprit Bumrah", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Arshdeep Singh", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Mohammed Siraj", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
    ];

    const australiaSquad = [
      { name: "Travis Head", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "David Warner", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Mitchell Marsh", role: "ALL_ROUNDER", isCaptain: true, isWicketKeeper: false },
      { name: "Glenn Maxwell", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Marcus Stoinis", role: "ALL_ROUNDER", isCaptain: false, isWicketKeeper: false },
      { name: "Tim David", role: "BATSMAN", isCaptain: false, isWicketKeeper: false },
      { name: "Matthew Wade", role: "WICKET_KEEPER", isCaptain: false, isWicketKeeper: true },
      { name: "Pat Cummins", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Mitchell Starc", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Adam Zampa", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
      { name: "Josh Hazlewood", role: "BOWLER", isCaptain: false, isWicketKeeper: false },
    ];

    const count = await LiveMatch.countDocuments();
    if (count > 0) {
      // Enrich matches that don't have squads yet
      await LiveMatch.updateMany(
        { "team1.players.0": { $exists: false }, "team1.name": "India" },
        {
          $set: {
            "team1.players": indiaSquad,
            "team2.players": australiaSquad,
            striker: { name: "Virat Kohli", runs: 76, balls: 48, fours: 6, sixes: 3, strikeRate: 158.3 },
            nonStriker: { name: "Hardik Pandya", runs: 28, balls: 14, fours: 2, sixes: 2, strikeRate: 200.0 },
            currentBowler: { name: "Mitchell Starc", overs: 3.2, maidens: 0, runsConceded: 34, wickets: 1, economy: 10.2 },
            recentBalls: ["1", "4", "0", "6", "W", "1", "2", "4"],
            currentOverBalls: ["1", "2", "4"],
            toss: "India won the toss and elected to bat",
            crr: "10.15",
            innings1: {
              teamName: "India",
              score: "186/4 (18.2 ov)",
              totalRuns: 186,
              wickets: 4,
              overs: 18.2,
              extras: { wides: 6, noBalls: 2, byes: 0, legByes: 4, total: 12 },
              batsmen: [
                { playerName: "Rohit Sharma", runs: 42, balls: 24, fours: 5, sixes: 2, strikeRate: 175.0, dismissalText: "c Head b Cummins", isOut: true },
                { playerName: "Rishabh Pant", runs: 18, balls: 11, fours: 3, sixes: 0, strikeRate: 163.6, dismissalText: "b Hazlewood", isOut: true },
                { playerName: "Suryakumar Yadav", runs: 12, balls: 8, fours: 1, sixes: 1, strikeRate: 150.0, dismissalText: "c Wade b Starc", isOut: true },
                { playerName: "Virat Kohli", runs: 76, balls: 48, fours: 6, sixes: 3, strikeRate: 158.3, dismissalText: "not out", isOut: false },
                { playerName: "Axar Patel", runs: 10, balls: 6, fours: 1, sixes: 0, strikeRate: 166.7, dismissalText: "run out (Maxwell)", isOut: true },
                { playerName: "Hardik Pandya", runs: 28, balls: 14, fours: 2, sixes: 2, strikeRate: 200.0, dismissalText: "not out", isOut: false },
              ],
              bowlers: [
                { bowlerName: "Mitchell Starc", overs: 3.2, maidens: 0, runsConceded: 34, wickets: 1, economy: 10.2 },
                { bowlerName: "Josh Hazlewood", overs: 4.0, maidens: 0, runsConceded: 38, wickets: 1, economy: 9.5 },
                { bowlerName: "Pat Cummins", overs: 4.0, maidens: 0, runsConceded: 41, wickets: 1, economy: 10.25 },
                { bowlerName: "Adam Zampa", overs: 4.0, maidens: 0, runsConceded: 39, wickets: 0, economy: 9.75 },
                { bowlerName: "Glenn Maxwell", overs: 3.0, maidens: 0, runsConceded: 30, wickets: 0, economy: 10.0 },
              ],
              fow: [
                { wicketNumber: 1, score: "52/1", over: "5.1", playerName: "Rohit Sharma" },
                { wicketNumber: 2, score: "78/2", over: "7.4", playerName: "Rishabh Pant" },
                { wicketNumber: 3, score: "110/3", over: "11.2", playerName: "Suryakumar Yadav" },
                { wicketNumber: 4, score: "135/4", over: "14.0", playerName: "Axar Patel" },
              ],
            },
            commentary: [
              { over: "18.2", ball: 2, text: "Starc to Hardik Pandya, FOUR! Smashed down the ground past mid-off!", runs: 4, isBoundary: true, boundaryType: "4", isWicket: false, timestamp: new Date() },
              { over: "18.1", ball: 1, text: "Starc to Virat Kohli, 1 run, pushed into the covers for a quick single.", runs: 1, isBoundary: false, boundaryType: "none", isWicket: false, timestamp: new Date(Date.now() - 30000) },
              { over: "17.6", ball: 6, text: "Hazlewood to Hardik Pandya, SIX! Incredible flick off the pads over deep square leg!", runs: 6, isBoundary: true, boundaryType: "6", isWicket: false, timestamp: new Date(Date.now() - 60000) },
            ],
          },
        }
      );
      return;
    }

    console.log("Seeding default demo live cricket matches with full scoring data...");

    await LiveMatch.create([
      {
        title: "India vs Australia - Super 8s T20 Championship",
        tournament: "ICC T20 World Cup 2026",
        matchFormat: "T20",
        venue: "Wankhede Stadium, Mumbai",
        startTime: new Date(),
        status: "LIVE",
        isLive: true,
        currentStatusText: "India won the toss and elected to bat | 1st Inning: 18.2 overs",
        streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        backupStreamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        streamType: "hls",
        banner: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop",
        isFeatured: true,
        isPremium: false,
        order: 1,
        viewersCount: 1420,
        isActive: true,
        toss: "India won the toss and elected to bat",
        crr: "10.15",
        team1: {
          name: "India",
          shortName: "IND",
          logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/200px-Flag_of_India.svg.png",
          score: "186/4 (18.2 ov)",
          players: indiaSquad,
        },
        team2: {
          name: "Australia",
          shortName: "AUS",
          logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Flag_of_Australia_%28converted%29.svg/200px-Flag_of_Australia_%28converted%29.svg.png",
          score: "Yet to bat",
          players: australiaSquad,
        },
        striker: { name: "Virat Kohli", runs: 76, balls: 48, fours: 6, sixes: 3, strikeRate: 158.3 },
        nonStriker: { name: "Hardik Pandya", runs: 28, balls: 14, fours: 2, sixes: 2, strikeRate: 200.0 },
        currentBowler: { name: "Mitchell Starc", overs: 3.2, maidens: 0, runsConceded: 34, wickets: 1, economy: 10.2 },
        recentBalls: ["1", "4", "0", "6", "W", "1", "2", "4"],
        currentOverBalls: ["1", "2", "4"],
        innings1: {
          teamName: "India",
          score: "186/4 (18.2 ov)",
          totalRuns: 186,
          wickets: 4,
          overs: 18.2,
          extras: { wides: 6, noBalls: 2, byes: 0, legByes: 4, total: 12 },
          batsmen: [
            { playerName: "Rohit Sharma", runs: 42, balls: 24, fours: 5, sixes: 2, strikeRate: 175.0, dismissalText: "c Head b Cummins", isOut: true },
            { playerName: "Rishabh Pant", runs: 18, balls: 11, fours: 3, sixes: 0, strikeRate: 163.6, dismissalText: "b Hazlewood", isOut: true },
            { playerName: "Suryakumar Yadav", runs: 12, balls: 8, fours: 1, sixes: 1, strikeRate: 150.0, dismissalText: "c Wade b Starc", isOut: true },
            { playerName: "Virat Kohli", runs: 76, balls: 48, fours: 6, sixes: 3, strikeRate: 158.3, dismissalText: "not out", isOut: false },
            { playerName: "Axar Patel", runs: 10, balls: 6, fours: 1, sixes: 0, strikeRate: 166.7, dismissalText: "run out (Maxwell)", isOut: true },
            { playerName: "Hardik Pandya", runs: 28, balls: 14, fours: 2, sixes: 2, strikeRate: 200.0, dismissalText: "not out", isOut: false },
          ],
          bowlers: [
            { bowlerName: "Mitchell Starc", overs: 3.2, maidens: 0, runsConceded: 34, wickets: 1, economy: 10.2 },
            { bowlerName: "Josh Hazlewood", overs: 4.0, maidens: 0, runsConceded: 38, wickets: 1, economy: 9.5 },
            { bowlerName: "Pat Cummins", overs: 4.0, maidens: 0, runsConceded: 41, wickets: 1, economy: 10.25 },
            { bowlerName: "Adam Zampa", overs: 4.0, maidens: 0, runsConceded: 39, wickets: 0, economy: 9.75 },
            { bowlerName: "Glenn Maxwell", overs: 3.0, maidens: 0, runsConceded: 30, wickets: 0, economy: 10.0 },
          ],
          fow: [
            { wicketNumber: 1, score: "52/1", over: "5.1", playerName: "Rohit Sharma" },
            { wicketNumber: 2, score: "78/2", over: "7.4", playerName: "Rishabh Pant" },
            { wicketNumber: 3, score: "110/3", over: "11.2", playerName: "Suryakumar Yadav" },
            { wicketNumber: 4, score: "135/4", over: "14.0", playerName: "Axar Patel" },
          ],
        },
        commentary: [
          { over: "18.2", ball: 2, text: "Starc to Hardik Pandya, FOUR! Smashed down the ground past mid-off!", runs: 4, isBoundary: true, boundaryType: "4", isWicket: false, timestamp: new Date() },
          { over: "18.1", ball: 1, text: "Starc to Virat Kohli, 1 run, pushed into the covers for a quick single.", runs: 1, isBoundary: false, boundaryType: "none", isWicket: false, timestamp: new Date(Date.now() - 30000) },
          { over: "17.6", ball: 6, text: "Hazlewood to Hardik Pandya, SIX! Incredible flick off the pads over deep square leg!", runs: 6, isBoundary: true, boundaryType: "6", isWicket: false, timestamp: new Date(Date.now() - 60000) },
        ],
      },
    ]);

    console.log("Default live cricket matches seeded successfully.");
  } catch (err) {
    console.error("Failed to seed default live matches:", err);
  }
};

module.exports = createDefaultLiveMatches;
