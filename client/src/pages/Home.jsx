import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function Home() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("home"); // home | create | join

  // Settings for room creation
  const [settings, setSettings] = useState({
    language: "telugu",
    rounds: 3,
    drawTime: 80,
    maxPlayers: 8,
    decade: "all",
    difficulty: "all",
  });

  const handleCreate = () => {
    if (!playerName.trim()) return alert("Enter your name!");
    socket.connect();
    socket.emit("create_room", { playerName, settings });
    socket.once("room_created", (room) => {
      navigate(`/room/${room.code}`, { state: { room, playerName } });
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) return alert("Enter your name!");
    if (!roomCode.trim()) return alert("Enter room code!");
    socket.connect();
    socket.emit("join_room", { roomCode, playerName });
    socket.once("room_updated", (room) => {
      navigate(`/room/${room.code}`, { state: { room, playerName } });
    });
    socket.once("join_error", (err) => alert(err));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-6xl font-black tracking-tight">
          🎬 <span className="text-yellow-400">Cine</span>Sketch
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Draw & Guess Telugu Movies!</p>
      </div>

      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800">
        {/* Name Input */}
        <input
          className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-4 outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="Your name..."
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />

        {mode === "home" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode("create")}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold py-3 rounded-xl transition"
            >
              🏠 Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition"
            >
              🔗 Join Room
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="flex flex-col gap-3">
            <h2 className="text-yellow-400 font-bold text-lg mb-1">Room Settings</h2>

            <label className="text-gray-400 text-sm">Language</label>
            <select
              className="bg-gray-800 rounded-xl px-4 py-2 text-white outline-none"
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            >
              <option value="telugu">Telugu 🎬</option>
              <option value="hindi" disabled>Hindi (coming soon)</option>
            </select>

            <label className="text-gray-400 text-sm">Rounds</label>
            <select
              className="bg-gray-800 rounded-xl px-4 py-2 text-white outline-none"
              value={settings.rounds}
              onChange={(e) => setSettings({ ...settings, rounds: Number(e.target.value) })}
            >
              {[2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} Rounds</option>)}
            </select>

            <label className="text-gray-400 text-sm">Draw Time (seconds)</label>
            <select
              className="bg-gray-800 rounded-xl px-4 py-2 text-white outline-none"
              value={settings.drawTime}
              onChange={(e) => setSettings({ ...settings, drawTime: Number(e.target.value) })}
            >
              {[60, 80, 100, 120].map((t) => <option key={t} value={t}>{t}s</option>)}
            </select>

            <label className="text-gray-400 text-sm">Max Players</label>
            <select
              className="bg-gray-800 rounded-xl px-4 py-2 text-white outline-none"
              value={settings.maxPlayers}
              onChange={(e) => setSettings({ ...settings, maxPlayers: Number(e.target.value) })}
            >
              {[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} Players</option>)}
            </select>

            <label className="text-gray-400 text-sm">Decade (select multiple)</label>
            <div className="flex flex-wrap gap-2">
            {["2020s", "2010s", "2000s", "1990s"].map((d) => (
                <button
                key={d}
                type="button"
                onClick={() => {
                    const current = settings.decade === "all" ? [] : settings.decade.split(",");
                    const updated = current.includes(d)
                    ? current.filter((x) => x !== d)
                    : [...current, d];
                    setSettings({ ...settings, decade: updated.length ? updated.join(",") : "all" });
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                    (settings.decade === "all" ? [] : settings.decade.split(",")).includes(d)
                    ? "bg-yellow-400 text-gray-950 border-yellow-400"
                    : "bg-gray-800 text-gray-300 border-gray-700 hover:border-yellow-400"
                }`}
                >
                {d}
                </button>
            ))}
            <button
                type="button"
                onClick={() => setSettings({ ...settings, decade: "all" })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                settings.decade === "all"
                    ? "bg-yellow-400 text-gray-950 border-yellow-400"
                    : "bg-gray-800 text-gray-300 border-gray-700 hover:border-yellow-400"
                }`}
            >
                All
            </button>
            </div>

            <button
              onClick={handleCreate}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold py-3 rounded-xl mt-2 transition"
            >
              🚀 Create Room
            </button>
            <button onClick={() => setMode("home")} className="text-gray-500 text-sm text-center hover:text-gray-300">← Back</button>
          </div>
        )}

        {mode === "join" && (
          <div className="flex flex-col gap-3">
            <input
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-yellow-400 uppercase tracking-widest"
              placeholder="Room Code..."
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              onClick={handleJoin}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold py-3 rounded-xl transition"
            >
              🎮 Join Room
            </button>
            <button onClick={() => setMode("home")} className="text-gray-500 text-sm text-center hover:text-gray-300">← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}