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
  .concat(["http://localhost:3000","https://revisionkarlo.in", "http://localhost:5173"]);

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

  // Frontend emits "join-coaching" with full room string e.g. "coaching:abc123"
  socket.on("join-coaching", (room) => {
    if (!room) return;
    socket.join(room);
    console.log(`[socket] ${socket.id} joined ${room}`);
  });

  socket.on("leave-coaching", (room) => {
    if (!room) return;
    socket.leave(room);
    console.log(`[socket] ${socket.id} left ${room}`);
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
