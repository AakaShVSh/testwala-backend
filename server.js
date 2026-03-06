require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/App");
const connect = require("./src/configs/db");
const { setIO } = require("./src/socket");

const PORT = process.env.PORT || 8080;

// ── Allowed origins (same list as CORS in App.js) ───────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(["http://localhost:3000", "http://localhost:5173"]);

// ── Create HTTP server from Express app ─────────────────────────────────────
const httpServer = http.createServer(app);

// ── Attach Socket.io ─────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST"],
  },
  // Use websocket first, fall back to polling if websocket blocked
  transports: ["websocket", "polling"],
});

// ── Store io singleton so controllers can emit from anywhere ─────────────────
setIO(io);

// ── Socket connection handler ────────────────────────────────────────────────
io.on("connection", (socket) => {
  // Coach joins a room for their coaching so they get real-time updates
  // Client emits: socket.emit("join:coaching", coachingId)
  socket.on("join:coaching", (coachingId) => {
    if (!coachingId) return;
    const room = `coaching:${coachingId}`;
    socket.join(room);
    console.log(`[socket] ${socket.id} joined room ${room}`);
  });

  socket.on("leave:coaching", (coachingId) => {
    if (!coachingId) return;
    socket.leave(`coaching:${coachingId}`);
  });

  socket.on("disconnect", () => {
    // Rooms are automatically cleaned up on disconnect
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connect();
    console.log("✅ MongoDB connected");
    httpServer.listen(PORT, () =>
      console.log(`🚀 Server + Socket.io running on port ${PORT}`),
    );
  } catch (err) {
    console.error("❌ Startup error:", err.message);
    process.exit(1);
  }
}

start();
