const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  rooms,
} = require("./game/roomManager");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("CineSketch server is running 🎬"));

io.on("connection", (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);

  // Create room
  socket.on("create_room", ({ playerName, settings }) => {
    const room = createRoom(socket.id, playerName, settings);
    socket.join(room.code);
    socket.emit("room_created", room);
    console.log(`🏠 Room created: ${room.code} by ${playerName}`);
  });

  // Join room
  socket.on("join_room", ({ roomCode, playerName }) => {
    const result = joinRoom(roomCode.toUpperCase(), socket.id, playerName);
    if (result.error) {
      socket.emit("join_error", result.error);
      return;
    }
    socket.join(roomCode.toUpperCase());
    // Send to the rejoining player directly
    socket.emit("room_updated", result.room);
    // Broadcast to everyone else in the room
    socket.to(roomCode.toUpperCase()).emit("room_updated", result.room);
    console.log(`👤 ${playerName} joined/rejoined room ${roomCode}`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
  
    // Mark player as disconnected in their room
    Object.values(rooms).forEach((room) => {
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.disconnected = true;
        io.to(room.code).emit("room_updated", room);
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});