import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 inline-block ml-2" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = () => {
    if (!playerName.trim()) return alert("Enter your name!");
    setLoading(true);
    socket.connect();
    socket.emit("join_room", { roomCode: code, playerName });
    socket.once("room_updated", (room) => {
      setLoading(false);
      sessionStorage.setItem(`playerName_${code}`, playerName);
      if (room.status === "playing") {
        socket.emit("rejoin_game", { roomCode: code, playerName });
        navigate(`/game/${code}`, { state: { playerName } });
      } else {
        navigate(`/room/${code}`, { state: { room, playerName } });
      }
    });
    socket.once("join_error", (err) => {
      setLoading(false);
      alert(err);
    });
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
          disabled={loading}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-gray-950 font-black text-lg py-3 rounded-xl transition"
        >
          {loading ? <>Joining <Spinner /></> : "🎮 Join Game"}
        </button>
      </div>
    </div>
  );
}