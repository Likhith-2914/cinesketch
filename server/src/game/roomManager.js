const rooms = {};
const { fetchMoviesForLanguage } = require("./movieFetcher");
const fallbackTelugu = require("../../../shared/words/telugu");

// Cache per language
const movieCache = {
  telugu: null,
  hindi: null,
  lastFetched: null,
};

async function initMovieBank() {
  console.log("🎬 Initializing movie banks...");
  try {
    const [telugu, hindi] = await Promise.all([
      fetchMoviesForLanguage("telugu", 8),
      fetchMoviesForLanguage("hindi", 8),
    ]);

    movieCache.telugu = telugu?.length ? telugu : fallbackTelugu;
    movieCache.hindi = hindi?.length ? hindi : fallbackTelugu;
    movieCache.lastFetched = new Date();

    console.log(`✅ Movie banks ready — Telugu: ${movieCache.telugu.length}, Hindi: ${movieCache.hindi.length}`);
  } catch (e) {
    console.error("❌ Movie bank init failed:", e.message);
    movieCache.telugu = fallbackTelugu;
    movieCache.hindi = fallbackTelugu;
  }
}

// Refresh every 30 days
function scheduleMonthlyRefresh() {
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  setTimeout(() => {
    console.log("🔄 Monthly movie bank refresh...");
    initMovieBank();
    setInterval(() => {
      console.log("🔄 Monthly movie bank refresh...");
      initMovieBank();
    }, thirtyDays);
  }, thirtyDays);
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom(adminId, adminName, settings) {
  const code = generateRoomCode();
  rooms[code] = {
    code,
    admin: adminId,
    settings: {
      language: settings.language || "telugu",
      rounds: settings.rounds || 3,
      drawTime: settings.drawTime || 80,
      maxPlayers: settings.maxPlayers || 8,
      decade: settings.decade || "all",
      difficulty: settings.difficulty || "all",
    },
    players: [{ id: adminId, name: adminName, score: 0, isAdmin: true }],
    status: "waiting", // waiting | playing | finished
    wordBank: [],
  };
  return rooms[code];
}

function joinRoom(code, playerId, playerName) {
    const room = rooms[code];
    if (!room) return { error: "Room not found" };
  
    // Allow rejoining if game is playing, block only finished games
    if (room.status === "finished") return { error: "Game has ended" };
  
    if (room.players.length >= room.settings.maxPlayers)
      return { error: "Room is full" };
  
    // Check if same socket already in room
    if (room.players.find((p) => p.id === playerId)) return { room };
  
    // Check if name already exists
    const existingPlayer = room.players.find(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );
  
    if (existingPlayer) {
      if (existingPlayer.disconnected) {
        existingPlayer.id = playerId;
        existingPlayer.disconnected = false;
        if (existingPlayer.isAdmin) room.admin = playerId;
        return { room };
      } else {
        return { error: "Name already taken in this room!" };
      }
    }
  
    room.players.push({ id: playerId, name: playerName, score: 0, isAdmin: false, disconnected: false });
    return { room };
  }

function leaveRoom(code, playerId) {
  const room = rooms[code];
  if (!room) return;
  room.players = room.players.filter((p) => p.id !== playerId);

  // If admin left, assign new admin
  if (room.players.length > 0 && !room.players.find((p) => p.isAdmin)) {
    room.players[0].isAdmin = true;
    room.admin = room.players[0].id;
  }

  // Delete empty rooms
  if (room.players.length === 0) delete rooms[code];
  return room;
}

function getWordBank(language, decade, difficulty) {
  let movies = movieCache[language] || fallbackTelugu;

  if (decade !== "all") {
    const decades = decade.split(",");
    movies = movies.filter((m) => decades.includes(m.decade));
  }
  if (difficulty !== "all") {
    movies = movies.filter((m) => m.difficulty === difficulty);
  }

  // If filters leave too few movies, relax filters
  if (movies.length < 10) {
    movies = movieCache[language] || fallbackTelugu;
  }

  return [...movies].sort(() => Math.random() - 0.5);
}

function getRoom(code) {
  return rooms[code];
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getWordBank,
  rooms,
  initMovieBank,
  scheduleMonthlyRefresh,
};