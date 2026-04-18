/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { socket } from "../socket";
import Canvas from "../components/Canvas/Canvas";
import Chat from "../components/Chat/Chat";
import PlayerList from "../components/PlayerList/PlayerList";
import CluePanel from "../components/CluePanel/CluePanel";
import Timer from "../components/Timer/Timer";
import { sounds } from "../utils/sounds";

export default function Game() {
  const { code } = useParams();
  const { state } = useLocation();
  const playerName =
    state?.playerName || sessionStorage.getItem(`playerName_${code}`);

  const [gameState, setGameState] = useState({
    isDrawer: false,
    word: "",
    wordLength: 0,
    drawer: "",
    round: 1,
    totalRounds: 3,
    players: [],
    timeLeft: 0,
    status: "waiting", // waiting | drawing | roundEnd | gameEnd
    clue: { hero: "", heroine: "" },
    messages: [],
    options: [],
    guessLocked: false,
    guessCorrect: false,
  });

  const submitGuess = (guess) => {
    socket.emit("submit_guess", { roomCode: code, playerName, guess });
  };

  useEffect(() => {

    if (playerName && code) {
        socket.connect();
        socket.emit("rejoin_game", { roomCode: code, playerName });
    }

    socket.on("turn_start", (data) => {
      setGameState((prev) => ({
        ...prev,
        isDrawer: data.isDrawer,
        word: data.word || "",
        drawer: data.drawer,
        round: data.round,
        totalRounds: data.totalRounds,
        status: "drawing",
        clue: { hero: null, heroine: null, movieFirstChar: null },
        messages: [],
        players: data.players || prev.players,
        options: data.options || [],
        guessLocked: false,
        guessCorrect: false,
      }));
    });

    socket.on("wrong_guess", ({ message }) => {
      setGameState((prev) => ({
        ...prev,
        guessLocked: true,
        guessCorrect: false,
        messages: [...prev.messages, { senderName: "System", message, type: "system" }],
      }));
    });
    
      socket.on("timer_update", ({ timeLeft }) => {
        if (timeLeft <= 10 && timeLeft > 0) sounds.timerTick(); // add this
        setGameState((prev) => ({ ...prev, timeLeft }));
      });

      socket.on("clue_update", ({ heroClue, heroineClue, movieFirstChar }) => {
        setGameState((prev) => ({
          ...prev,
          clue: {
            hero: heroClue ?? prev.clue.hero,
            heroine: heroineClue ?? prev.clue.heroine,
            movieFirstChar: movieFirstChar ?? prev.clue.movieFirstChar,
          },
        }));
      });

      socket.on("player_guessed", ({ playerName: guesser, players }) => {
        sounds.correctGuess();
        setGameState((prev) => ({
          ...prev,
          players,
          guessLocked: prev.guessLocked || guesser === playerName,
          guessCorrect: prev.guessCorrect || guesser === playerName,
          messages: [
            ...prev.messages,
            { senderName: "🎉 System", message: `${guesser} guessed correctly!`, type: "system" },
          ],
        }));
      });

    socket.on("chat_message", (msg) => {
      setGameState((prev) => ({
        ...prev,
        messages: [...prev.messages, msg],
      }));
    });

    socket.on("turn_end", ({ word, hero, heroine, players }) => {
      sounds.turnEnd(); 
      setGameState((prev) => ({
        ...prev,
        status: "roundEnd",
        players,
        messages: [
          ...prev.messages,
          {
            senderName: "🎬 System",
            message: `The movie was: ${word} | Hero: ${hero} | Heroine: ${heroine}`,
            type: "system",
          },
        ],
      }));
    });

    socket.on("game_end", ({ players }) => {
      sounds.gameEnd(); 
      setGameState((prev) => ({ ...prev, status: "gameEnd", players }));
    });

    socket.on("player_disconnected", ({ playerName: who, players }) => {
        setGameState((prev) => ({
          ...prev,
          players,
          messages: [
            ...prev.messages,
            { senderName: "🎬 System", message: `${who} disconnected`, type: "system" },
          ],
        }));
      });
      
      socket.on("player_reconnected", ({ playerName: who, players }) => {
        setGameState((prev) => ({
          ...prev,
          players,
          messages: [
            ...prev.messages,
            { senderName: "🎬 System", message: `${who} reconnected!`, type: "system" },
          ],
        }));
      });

    return () => {
      socket.off("turn_start");
      socket.off("timer_update");
      socket.off("clue_update");
      socket.off("player_guessed");
      socket.off("chat_message");
      socket.off("turn_end");
      socket.off("game_end");
      socket.off("player_disconnected");
      socket.off("player_reconnected");
    };
  }, []);

  const sendMessage = (message) => {
    socket.emit("send_message", { roomCode: code, playerName, message });
  };

  if (gameState.status === "gameEnd") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-black text-yellow-400 mb-8">🏆 Game Over!</h1>
        <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-800">
          {gameState.players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0">
              <span className="text-2xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
              <span className="font-bold flex-1">{p.name}</span>
              <span className="text-yellow-400 font-black">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <h1 className="text-xl font-black">🎬 <span className="text-yellow-400">Cine</span>Sketch</h1>
        <div className="text-gray-400 text-sm">Round {gameState.round}/{gameState.totalRounds}</div>
        <Timer timeLeft={gameState.timeLeft} drawTime={80} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Players */}
        <div className="w-40 bg-gray-900 border-r border-gray-800 p-2 hidden md:block">
          <PlayerList players={gameState.players} currentDrawer={gameState.drawer} />
        </div>

        {/* Center — Canvas + Options */}
        <div className="flex-1 flex flex-col items-center p-2 gap-2">

        {/* Word display for drawer only */}
        {gameState.isDrawer && (
          <div className="bg-gray-900 rounded-xl px-6 py-2 text-center border border-gray-800 w-full max-w-xl">
            <p className="text-yellow-400 font-black text-xl tracking-widest">{gameState.word}</p>
            <p className="text-gray-500 text-xs mt-1">You are drawing!</p>
          </div>
        )}

        {!gameState.isDrawer && (
          <div className="text-center text-gray-400 text-sm">
            ✏️ <span className="text-yellow-400 font-bold">{gameState.drawer}</span> is drawing
          </div>
        )}

        {/* Clue Panel for guessers */}
        {!gameState.isDrawer && (
          gameState.clue.hero || gameState.clue.heroine
        ) && (
          <CluePanel
            heroClue={gameState.clue.hero}
            heroineClue={gameState.clue.heroine}
          />
        )}

        {/* Canvas */}
        <Canvas
          roomCode={code}
          isDrawer={gameState.isDrawer}
          socket={socket}
        />

        {/* Options for guessers */}
        {!gameState.isDrawer && gameState.options.length > 0 && (
          <Options
            options={gameState.options}
            onGuess={submitGuess}
            locked={gameState.guessLocked}
            correct={gameState.guessCorrect}
          />
        )}
        </div>
        {/* Right — Chat */}
        <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col">
          <Chat
            messages={gameState.messages}
            onSend={sendMessage}
            isDrawer={gameState.isDrawer}
            playerName={playerName}
          />
        </div>
      </div>
    </div>
  );
}