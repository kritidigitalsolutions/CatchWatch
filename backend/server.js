require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const createDefaultAdmin = require("./utils/createDefaultAdmin");
const createDefaultDemoUser = require("./utils/createDefaultDemoUser");
const createDefaultSponsoredAds = require("./utils/createDefaultSponsoredAds");
const createDefaultLiveMatches = require("./utils/createDefaultLiveMatches");
const { initSocket } = require("./socket/chatSocket");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect Database
    await connectDB();

    // Create Default Admin, Demo User, and Sponsored Ads
    await createDefaultAdmin();
    await createDefaultDemoUser();
    await createDefaultSponsoredAds();
    // createDefaultLiveMatches removed to ensure all matches and players are created only via Admin Panel

    // Create HTTP Server
    const server = http.createServer(app);

    // Initialize Socket.IO with CORS origins
    initSocket(server, app.allowedOrigins);

    // Support large file uploads by increasing timeouts to 20 minutes
    server.timeout = 20 * 60 * 1000;
    server.keepAliveTimeout = 20 * 60 * 1000;
    server.headersTimeout = 21 * 60 * 1000;

    // Start Server
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT} with Socket.IO support 🚀`);
    });
  } catch (error) {
    console.error("❌ Server Error:", error);
    process.exit(1);
  }
};

startServer();