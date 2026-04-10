import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function Room() {
  const { code } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState(state?.room || null);
  const playerName = state?.playerName;

  useEffect(() => {
    if (state?.playerName) {
      sessionStorage.setItem(`playerName_${code}`, state.playerName);
    }
  
    if (playerName && code) {
      socket.connect();
      socket.emit("join_room", { roomCode: code, playerName });
    }
  
    socket.on("room_updated", (updatedRoom) => {
      setRoom(updatedRoom);
      // If game already started, redirect to game
      if (updatedRoom.status === "playing") {
        socket.emit("rejoin_game", { roomCode: code, playerName });
        navigate(`/game/${code}`, { state: { playerName } });
      }
    });
  
    socket.on("game_started", () => {
      navigate(`/game/${code}`, { state: { playerName } });
    });
  
    return () => {
      socket.off("room_updated");
      socket.off("game_started");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // Add this effect:
    useEffect(() => {
    socket.on("game_started", () => {
        navigate(`/game/${code}`, { state: { playerName } });
    });
    return () => socket.off("game_started");

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const copyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
        alert("Link copied!");
    };

    if (!room) return <div className="text-white p-8">Loading room...</div>;

    const isAdmin = room.players.find(
        (p) => p.id === socket.id && p.isAdmin
    );

    const handleStart = () => {
        socket.emit("start_game", { roomCode: code });
    };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black">🎬 <span className="text-yellow-400">Cine</span>Sketch</h1>
          <p className="text-gray-400 mt-1">Waiting for players...</p>
        </div>

        {/* Room Code */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-4 border border-gray-800 text-center">
          <p className="text-gray-400 text-sm mb-1">Room Code</p>
          <p className="text-5xl font-black tracking-widest text-yellow-400">{code}</p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={copyLink}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-sm transition"
            >
              🔗 Copy Invite Link
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-sm transition"
            >
              📋 Copy Code
            </button>
          </div>
        </div>

        {/* Settings Summary */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-800">
          <p className="text-gray-400 text-sm mb-2 font-semibold">Game Settings</p>
          <div className="flex flex-wrap gap-2">
            {[
              `🌐 ${room.settings.language}`,
              `🔄 ${room.settings.rounds} rounds`,
              `⏱ ${room.settings.drawTime}s`,
              `👥 Max ${room.settings.maxPlayers}`,
              `📅 ${room.settings.decade}`,
              `⭐ ${room.settings.difficulty}`,
            ].map((s) => (
              <span key={s} className="bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-3 font-semibold">
            Players ({room.players.length}/{room.settings.maxPlayers})
          </p>
          <div className="grid grid-cols-2 gap-2">
          {room.players.map((p) => (
            <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                p.disconnected ? "bg-gray-800 opacity-50" : "bg-gray-800"
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                p.disconnected ? "bg-gray-600 text-gray-400" : "bg-yellow-400 text-gray-950"
                }`}>
                {p.name[0].toUpperCase()}
                </div>
                <span className="font-medium">{p.name}</span>
                {p.disconnected && <span className="ml-auto text-xs text-gray-500">⚡ Reconnecting</span>}
                {p.isAdmin && !p.disconnected && <span className="ml-auto text-xs text-yellow-400">👑 Admin</span>}
            </div>
            ))}
          </div>
        </div>

        

        {/* Start Button (admin only) */}
        {isAdmin && (
          <button
          onClick={handleStart}
          disabled={room.players.length < 2}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 font-black text-xl py-4 rounded-2xl transition"
            >
            🎬 Start Game ({room.players.length}/2 min players)
            </button>
        )}
        {!isAdmin && (
          <p className="text-center text-gray-500">Waiting for admin to start the game...</p>
        )}
      </div>
    </div>
  );
}