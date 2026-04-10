import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");

  const handleJoin = () => {
    if (!playerName.trim()) return alert("Enter your name!");

    socket.connect();

    // First join the room
    socket.emit("join_room", { roomCode: code, playerName });

    socket.once("room_updated", (room) => {
      sessionStorage.setItem(`playerName_${code}`, playerName);

      if (room.status === "playing") {
        // Game in progress — rejoin game directly
        socket.emit("rejoin_game", { roomCode: code, playerName });
        navigate(`/game/${code}`, { state: { playerName } });
      } else {
        // Still in lobby
        navigate(`/room/${code}`, { state: { room, playerName } });
      }
    });

    socket.once("join_error", (err) => alert(err));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800 text-center">
        <h1 className="text-4xl font-black mb-2">
          🎬 <span className="text-yellow-400">Cine</span>Sketch
        </h1>
        <p className="text-gray-400 mb-6">
          You've been invited to join room{" "}
          <span className="text-yellow-400 font-bold tracking-widest">{code}</span>
        </p>

        <input
          className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-4 outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="Enter your name..."
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          autoFocus
        />
        <button
          onClick={handleJoin}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-lg py-3 rounded-xl transition"
        >
          🎮 Join Game
        </button>
      </div>
    </div>
  );
}