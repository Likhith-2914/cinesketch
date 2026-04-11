const { getWordBank } = require("./roomManager");

const gameStates = {};

function startGame(room, io) {
  const { code, settings, players } = room;

  const wordBank = getWordBank(
    settings.language,
    settings.decade,
    settings.difficulty
  );

  gameStates[code] = {
    roomCode: code,
    round: 1,
    totalRounds: settings.rounds,
    drawTime: settings.drawTime,
    players: players.map((p) => ({ ...p, score: 0, disconnected: false })),
    wordBank,
    usedWords: [],
    currentWord: null,
    currentDrawer: null,
    drawerIndex: 0,
    status: "drawing",
    guessedPlayers: [],
    turnStartTime: null,
    currentTimeLeft: 0,
    clueState: { heroRevealed: [], heroineRevealed: [] },
  };

  startTurn(code, io);
}

function startTurn(roomCode, io) {
  const state = gameStates[roomCode];
  if (!state) return;

  // Skip disconnected drawers
  let attempts = 0;
  while (
    state.players[state.drawerIndex % state.players.length]?.disconnected &&
    attempts < state.players.length
  ) {
    state.drawerIndex++;
    attempts++;
  }

  state.drawerIndex = state.drawerIndex % state.players.length;
  state.currentDrawer = state.players[state.drawerIndex];
  state.guessedPlayers = [];
  state.clueState = { heroRevealed: [], heroineRevealed: [] };
  state.turnStartTime = Date.now();

  // Pick word
  const available = state.wordBank.filter(
    (w) => !state.usedWords.includes(w.title)
  );
  if (available.length === 0) {
    endGame(roomCode, io);
    return;
  }
  const word = available[Math.floor(Math.random() * available.length)];
  state.currentWord = word;
  state.usedWords.push(word.title);

  // Notify all players
  state.players.forEach((player) => {
    const isDrawer = player.id === state.currentDrawer.id;
    io.to(player.id).emit("turn_start", {
      word: isDrawer ? word.title : "_".repeat(word.title.length),
      wordLength: word.title.length,
      isDrawer,
      drawer: state.currentDrawer.name,
      round: state.round,
      totalRounds: state.totalRounds,
      players: state.players,
    });
  });

  startTimer(roomCode, io);
  scheduleClues(roomCode, io);
}

function startTimer(roomCode, io) {
  const state = gameStates[roomCode];
  if (!state) return;

  let timeLeft = state.drawTime;
  state.status = "drawing";
  state.currentTimeLeft = timeLeft;

  io.to(roomCode).emit("timer_update", { timeLeft });

  state.timerInterval = setInterval(() => {
    timeLeft--;
    state.currentTimeLeft = timeLeft;
    io.to(roomCode).emit("timer_update", { timeLeft });

    if (timeLeft <= 0) {
      clearInterval(state.timerInterval);
      endTurn(roomCode, io);
    }
  }, 1000);
}

function scheduleClues(roomCode, io) {
  const state = gameStates[roomCode];
  if (!state) return;

  const word = state.currentWord;
  const totalClues = 3;
  const interval = Math.floor((state.drawTime / (totalClues + 1)) * 1000);

  let clueStep = 0;

  state.clueInterval = setInterval(() => {
    if (state.status !== "drawing") {
      clearInterval(state.clueInterval);
      return;
    }

    clueStep++;

    let heroClue = null;
    let heroineClue = null;
    let movieFirstChar = null;

    if (clueStep === 1) heroClue = word.hero[0];
    if (clueStep === 2) heroineClue = word.heroine[0];
    if (clueStep >= 3) {
      movieFirstChar = word.title[0];
      clearInterval(state.clueInterval);
    }

    state.players.forEach((player) => {
      if (player.id !== state.currentDrawer.id && !player.disconnected) {
        io.to(player.id).emit("clue_update", {
          heroClue,
          heroineClue,
          movieFirstChar,
        });
      }
    });
  }, interval);
}

function maskName(name, revealedIndices) {
  let letterIndex = 0;
  return name.split("").map((char) => {
    if (char === " ") return " ";
    const reveal = revealedIndices.includes(letterIndex);
    letterIndex++;
    return reveal ? char : "_";
  }).join("");
}

function checkGuess(roomCode, playerId, playerName, guess, io) {
    const state = gameStates[roomCode];
    if (!state || state.status !== "drawing") return false;
    if (playerId === state.currentDrawer.id) return false;
  
    // Find by both ID and name to handle rejoin edge cases
    const player = state.players.find(
      (p) => p.id === playerId || p.name.toLowerCase() === playerName.toLowerCase()
    );
  
    if (!player) return false;
    if (state.guessedPlayers.includes(player.name)) return false;
  
    const correct =
      guess.trim().toLowerCase() === state.currentWord.title.toLowerCase();
  
    if (correct) {
      state.guessedPlayers.push(player.name); // use name not ID
  
      const elapsed = Math.floor((Date.now() - state.turnStartTime) / 1000);
      const timeLeft = Math.max(0, state.drawTime - elapsed);
      const points = Math.max(100, Math.floor((timeLeft / state.drawTime) * 500));
  
      player.score += points;
  
      const drawer = state.players.find((p) => p.id === state.currentDrawer.id);
      if (drawer) drawer.score += 50;
  
      io.to(roomCode).emit("player_guessed", {
        playerName: player.name,
        players: state.players,
      });
  
      // End turn if all connected non-drawers guessed
      const connectedGuessers = state.players.filter(
        (p) => p.name !== state.currentDrawer.name && !p.disconnected
      );
      if (state.guessedPlayers.length >= connectedGuessers.length) {
        clearInterval(state.timerInterval);
        clearInterval(state.clueInterval);
        endTurn(roomCode, io);
      }
    }
  
    return correct;
  }

// Called when drawer disconnects mid-turn
function handleDrawerLeft(roomCode, io) {
  const state = gameStates[roomCode];
  if (!state || state.status !== "drawing") return;

  clearInterval(state.timerInterval);
  clearInterval(state.clueInterval);

  io.to(roomCode).emit("chat_message", {
    senderName: "🎬 System",
    message: `Drawer left! Turn ended with 0 points.`,
    type: "system",
  });

  // No points awarded — move to next turn
  endTurn(roomCode, io, true);
}

function handlePlayerDisconnect(roomCode, playerId, io) {
  const state = gameStates[roomCode];
  if (!state) return;

  const player = state.players.find((p) => p.id === playerId);
  if (player) {
    player.disconnected = true;
    io.to(roomCode).emit("player_disconnected", {
      playerName: player.name,
      players: state.players,
    });
  }

  // If drawer left, end the turn with zero points
  if (state.currentDrawer?.id === playerId) {
    handleDrawerLeft(roomCode, io);
  }
}

function rejoinGame(roomCode, playerId, playerName, io, socket) {
  const state = gameStates[roomCode];
  if (!state) return false;

  // Find by name to restore score
  const player = state.players.find(
    (p) => p.name.toLowerCase() === playerName.toLowerCase()
  );

  if (player) {
    // Update socket ID and mark as reconnected
    player.id = playerId;
    player.disconnected = false;
    if (state.currentDrawer?.name.toLowerCase() === playerName.toLowerCase()) {
      state.currentDrawer.id = playerId;
    }
  } else {
    // Brand new player joining mid-game
    state.players.push({
      id: playerId,
      name: playerName,
      score: 0,
      disconnected: false,
      isAdmin: false,
    });
  }

  socket.join(roomCode);

  // Notify everyone of reconnection
  io.to(roomCode).emit("player_reconnected", {
    playerName,
    players: state.players,
  });

  // Send current game state to rejoining player
  const isDrawer =
    state.currentDrawer?.name.toLowerCase() === playerName.toLowerCase();

  socket.emit("turn_start", {
    word: isDrawer
      ? state.currentWord.title
      : "_".repeat(state.currentWord.title.length),
    wordLength: state.currentWord.title.length,
    isDrawer,
    drawer: state.currentDrawer?.name,
    round: state.round,
    totalRounds: state.totalRounds,
    players: state.players,
  });

  socket.emit("timer_update", { timeLeft: state.currentTimeLeft || 0 });

  // Send current clue state if any revealed
  // Inside rejoinGame, replace the clue_update emit:
if (state.clueState.heroRevealed.length > 0 || state.clueState.heroineRevealed.length > 0) {
    // Replace the clue_update emit inside rejoinGame with:
  if (state.status === "drawing") {
    const elapsed = Math.floor((Date.now() - state.turnStartTime) / 1000);
    const clueStep = Math.floor(elapsed / (state.drawTime / 4));

    socket.emit("clue_update", {
      heroClue: clueStep >= 1 ? state.currentWord.hero[0] : null,
      heroineClue: clueStep >= 2 ? state.currentWord.heroine[0] : null,
      movieFirstChar: clueStep >= 3 ? state.currentWord.title[0] : null,
    });
}
  }

  return true;
}

function endTurn(roomCode, io, skipPoints = false) {
  const state = gameStates[roomCode];
  if (!state) return;

  state.status = "roundEnd";
  clearInterval(state.timerInterval);
  clearInterval(state.clueInterval);

  io.to(roomCode).emit("turn_end", {
    word: state.currentWord.title,
    hero: state.currentWord.hero,
    heroine: state.currentWord.heroine,
    players: state.players,
  });

  state.drawerIndex++;
  if (state.drawerIndex >= state.players.length) {
    state.drawerIndex = 0;
    state.round++;
  }

  if (state.round > state.totalRounds) {
    setTimeout(() => endGame(roomCode, io), 4000);
  } else {
    setTimeout(() => startTurn(roomCode, io), 4000);
  }
}

function endGame(roomCode, io) {
  const state = gameStates[roomCode];
  if (!state) return;

  state.status = "gameEnd";
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  io.to(roomCode).emit("game_end", { players: sorted });
  delete gameStates[roomCode];
}

function getGameState(roomCode) {
  return gameStates[roomCode];
}

module.exports = {
  startGame,
  checkGuess,
  getGameState,
  rejoinGame,
  handlePlayerDisconnect,
};