/**
 * server.js
 *
 * FIXES:
 * 1. "join-admin" event — admin clients join "room:admin" for broadcasts
 * 2. "join-user" handler was already there — kept
 * 3. "join-coaching" handler kept
 * All room names are explicit strings to avoid typos.
 */
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/App");
const connect = require("./src/configs/db");
const { setIO } = require("./src/socket");

const PORT = process.env.PORT || 8080;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat([
    "http://localhost:3000",
    "https://revisionkarlo.in",
    "http://localhost:5173",
  ]);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

setIO(io);

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // ── Coaching room (owner sees live test updates) ───────────────────────
  socket.on("join-coaching", (room) => {
    if (!room || typeof room !== "string") return;
    socket.join(room);
    console.log(`[socket] ${socket.id} joined ${room}`);
  });

  socket.on("leave-coaching", (room) => {
    if (!room) return;
    socket.leave(room);
    console.log(`[socket] ${socket.id} left ${room}`);
  });

  // ── Per-user room (personal notifications) ────────────────────────────
  socket.on("join-user", (room) => {
    if (!room || typeof room !== "string") return;
    socket.join(room);
    console.log(`[socket] ${socket.id} joined user room ${room}`);
  });

  socket.on("leave-user", (room) => {
    if (!room) return;
    socket.leave(room);
  });

  // ── Admin room — ALL admin tabs join this room ─────────────────────────
  // Frontend: socket.emit("join-admin") when isAdmin === true
  socket.on("join-admin", () => {
    socket.join("room:admin");
    console.log(`[socket] ${socket.id} joined admin room`);
  });

  socket.on("leave-admin", () => {
    socket.leave("room:admin");
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

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
