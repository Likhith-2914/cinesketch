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

  state.wrongGuessers = [];

  // Generate options for this turn
  const options = generateOptions(word, state.wordBank);
  state.currentOptions = options; // store for rejoining players

  // Everyone else gets options instead of blanks
  state.players.forEach((player) => {
    if (player.id === state.currentDrawer.id) {
      io.to(player.id).emit("turn_start", {
        word: word.title,
        hero: word.hero,
        heroine: word.heroine,
        isDrawer: true,
        drawer: state.currentDrawer.name,
        round: state.round,
        totalRounds: state.totalRounds,
        players: state.players,
      });
    } else {
      io.to(player.id).emit("turn_start", {
        isDrawer: false,
        drawer: state.currentDrawer.name,
        round: state.round,
        totalRounds: state.totalRounds,
        players: state.players,
        options,
      });
    }
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
  const interval = Math.floor((state.drawTime / 3) * 1000);

  state.currentClueStep = 0;

  state.clueInterval = setInterval(() => {
    if (state.status !== "drawing") {
      clearInterval(state.clueInterval);
      return;
    }

    state.currentClueStep++;

    const payload = {
      heroClue: state.currentClueStep >= 1 ? word.hero[0] : null,
      heroineClue: state.currentClueStep >= 2 ? word.heroine[0] : null,
    };

    if (state.currentClueStep >= 2) clearInterval(state.clueInterval);

    state.players.forEach((player) => {
      if (player.id !== state.currentDrawer.id && !player.disconnected) {
        io.to(player.id).emit("clue_update", payload);
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
  if (!state || state.status !== "drawing") return { correct: false, locked: false };

  if (playerId === state.currentDrawer?.id) return { correct: false, locked: false };

  const player = state.players.find(
    (p) => p.id === playerId || p.name.toLowerCase() === playerName.toLowerCase()
  );
  if (!player) return { correct: false, locked: false };

  // Already guessed correctly
  if (state.guessedPlayers.includes(player.name)) {
    return { correct: true, locked: true };
  }

  // Already guessed wrong — locked out
  if (state.wrongGuessers?.includes(player.name)) {
    return { correct: false, locked: true };
  }

  const correct =
    guess.trim().toLowerCase() === state.currentWord.title.toLowerCase();

  if (correct) {
    state.guessedPlayers.push(player.name);

    const elapsed = Math.floor((Date.now() - state.turnStartTime) / 1000);
    const timeLeft = Math.max(0, state.drawTime - elapsed);
    const points = Math.max(100, Math.floor((timeLeft / state.drawTime) * 500));

    player.score += points;

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
  } else {
    // Wrong answer — lock out this player
    if (!state.wrongGuessers) state.wrongGuessers = [];
    state.wrongGuessers.push(player.name);

    // Notify only this player they were wrong
    io.to(playerId).emit("wrong_guess", {
      message: "❌ Wrong answer! You're locked out for this turn.",
    });
  }

  return { correct, locked: !correct };
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
      word: isDrawer ? state.currentWord.title : null,
      isDrawer,
      drawer: state.currentDrawer?.name,
      round: state.round,
      totalRounds: state.totalRounds,
      players: state.players,
      options: isDrawer ? null : state.currentOptions,
    });

  socket.emit("timer_update", { timeLeft: state.currentTimeLeft || 0 });

  // Send current clue state if any revealed
  // Inside rejoinGame, replace the clue_update emit:
if (state.clueState.heroRevealed.length > 0 || state.clueState.heroineRevealed.length > 0) {
    // Replace the clue_update emit inside rejoinGame with:
  if (state.status === "drawing") {
    // Inside rejoinGame, replace clue emit with:
  if (state.status === "drawing") {
    const step = state.currentClueStep || 0;
    socket.emit("clue_update", {
      heroClue: step >= 1 ? state.currentWord.hero[0] : null,
      heroineClue: step >= 2 ? state.currentWord.heroine[0] : null,
      movieFirstChar: step >= 3 ? state.currentWord.title[0] : null,
    });
  }
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

function generateOptions(correctMovie, wordBank) {
  const decoys = wordBank
    .filter(
      (m) =>
        m.title !== correctMovie.title &&
        m.decade === correctMovie.decade
    )
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // If not enough same-decade movies, fill from full bank
  if (decoys.length < 3) {
    const extras = wordBank
      .filter(
        (m) =>
          m.title !== correctMovie.title &&
          !decoys.find((d) => d.title === m.title)
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - decoys.length);
    decoys.push(...extras);
  }

  const options = [correctMovie, ...decoys]
    .map((m) => m.title)
    .sort(() => Math.random() - 0.5);

  return options;
}

module.exports = {
  startGame,
  checkGuess,
  getGameState,
  rejoinGame,
  handlePlayerDisconnect,
};