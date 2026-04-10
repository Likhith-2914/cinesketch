const teluguMovies = require("../../../shared/words/telugu");
const rooms = {};

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
  let movies = teluguMovies; // expand for other languages later
  if (decade !== "all") movies = movies.filter((m) => m.decade === decade);
  if (difficulty !== "all") movies = movies.filter((m) => m.difficulty === difficulty);
  return movies.sort(() => Math.random() - 0.5); // shuffle
}

function getRoom(code) {
  return rooms[code];
}

module.exports = { createRoom, joinRoom, leaveRoom, getRoom, getWordBank, rooms };