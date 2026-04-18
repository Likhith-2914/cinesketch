const express = require("express");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  rooms,
  initMovieBank,
  scheduleMonthlyRefresh,
} = require("./game/roomManager");

const {
    startGame,
    checkGuess,
    getGameState,
    rejoinGame,
    handlePlayerDisconnect,
  } = require("./game/gameEngine");


const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: false,
  },
  transports: ["websocket", "polling"],
});

// Keep alive ping every 14 minutes
setInterval(() => {
  https.get(`https://cinesketch-server.onrender.com`, () => {
    console.log("💓 Keep alive ping");
  }).on("error", () => {});
}, 14 * 60 * 1000);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("CineSketch server is running 🎬"));

app.get("/movies/:language", (req, res) => {
  const { language } = req.params;
  const { movieCache } = require("./game/roomManager");
  const movies = movieCache[language];
  if (!movies) return res.status(404).json({ error: "Language not found" });
  res.json({
    language,
    total: movies.length,
    movies: movies.map((m) => ({
      title: m.title,
      hero: m.hero,
      heroine: m.heroine,
      decade: m.decade,
      difficulty: m.difficulty,
    })),
  });
});

// Initialize movie bank on startup
initMovieBank();
scheduleMonthlyRefresh();

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
  
    // Mark disconnected in lobby rooms
    Object.values(rooms).forEach((room) => {
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.disconnected = true;
        io.to(room.code).emit("room_updated", room);
      }
    });
  
    // Handle mid-game disconnect
    Object.values(rooms).forEach((room) => {
      if (room.status === "playing") {
        handlePlayerDisconnect(room.code, socket.id, io);
      }
    });
  });
  
  socket.on("rejoin_game", ({ roomCode, playerName }) => {
    const result = joinRoom(roomCode.toUpperCase(), socket.id, playerName);
    if (result.room) result.room.status = "playing";
  
    const rejoined = rejoinGame(roomCode.toUpperCase(), socket.id, playerName, io, socket);
    if (!rejoined) {
      socket.emit("join_error", "Game not found");
    }
  });
  // Start game
  socket.on("start_game", ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    if (room.admin !== socket.id) return; // only admin can start
  
    room.status = "playing";
    startGame(room, io);
    io.to(roomCode).emit("game_started");
  });
  
  // Drawing events
  socket.on("draw", ({ roomCode, drawData }) => {
    socket.to(roomCode).emit("draw", drawData);
  });
  
  socket.on("clear_canvas", ({ roomCode }) => {
    socket.to(roomCode).emit("clear_canvas");
  });
  
  // Chat & guessing
  socket.on("send_message", ({ roomCode, playerName, message }) => {
    const state = getGameState(roomCode);
  
    if (state?.currentDrawer?.id === socket.id) {
      socket.emit("chat_message", {
        senderName: "System",
        message: "Drawers can't chat during their turn!",
        type: "system",
      });
      return;
    }
  
    const isCorrect = checkGuess(roomCode, socket.id, playerName, message, io);
  
    if (isCorrect) {
      socket.emit("chat_message", {
        senderName: "🎉 System",
        message: "You guessed it correctly!",
        type: "correct",
      });
    } else {
      io.to(roomCode).emit("chat_message", {
        senderName: playerName,
        message,
        type: "normal",
      });
    }
  });

});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});