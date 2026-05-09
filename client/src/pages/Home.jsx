import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 inline-block ml-2" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("home");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    socket.connect();
    socket.emit("create_room", { playerName, settings });
    socket.once("room_created", (room) => {
      setLoading(false);
      navigate(`/room/${room.code}`, { state: { room, playerName } });
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) return alert("Enter your name!");
    if (!roomCode.trim()) return alert("Enter room code!");
    setLoading(true);
    socket.connect();
    socket.emit("join_room", { roomCode, playerName });
    socket.once("room_updated", (room) => {
      setLoading(false);
      navigate(`/room/${room.code}`, { state: { room, playerName } });
    });
    socket.once("join_error", (err) => {
      setLoading(false);
      alert(err);
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center text-2xl">
            🎬
          </div>
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-yellow-400">Cine</span>
            <span className="text-white">Sketch</span>
          </h1>
        </div>
        <p className="text-gray-400 text-lg">Draw & Guess Movies!</p>
        <div className="flex gap-2 justify-center mt-3">
          <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">🎭 Telugu</span>
          <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">🎥 Hindi</span>
          <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">🎬 English</span>
          <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">🖌️ Draw</span>
          <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">🏆 Compete</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800">
        {/* Name Input */}
        <input
          className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-4 outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="Your name..."
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && mode === "join" && handleJoin()}
        />

        {mode === "home" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode("create")}
              onKeyDown={(e) => e.key === "Enter" && setMode("create")}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold py-3 rounded-xl transition"
            >
              🏠 Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              onKeyDown={(e) => e.key === "Enter" && setMode("join")}
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
              <option value="hindi">Hindi 🎥</option>
              <option value="english">English 🎬</option>
              <option value="telugu,hindi">Telugu + Hindi</option>
              <option value="telugu,english">Telugu + English</option>
              <option value="hindi,english">Hindi + English</option>
              <option value="telugu,hindi,english">All Languages</option>
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

            <label className="text-gray-400 text-sm">Difficulty</label>
            <select
              className="bg-gray-800 rounded-xl px-4 py-2 text-white outline-none"
              value={settings.difficulty}
              onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}
            >
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-gray-950 font-bold py-3 rounded-xl mt-2 transition"
            >
              {loading ? <>Creating Room <Spinner /></> : "🚀 Create Room"}
            </button>
            <button
              onClick={() => setMode("home")}
              className="text-gray-500 text-sm text-center hover:text-gray-300"
            >
              ← Back
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="flex flex-col gap-3">
            <input
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-yellow-400 uppercase tracking-widest"
              placeholder="Room Code..."
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={6}
              autoFocus
            />
            <button
              onClick={handleJoin}
              disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-gray-950 font-bold py-3 rounded-xl transition"
            >
              {loading ? <>Joining <Spinner /></> : "🎮 Join Room"}
            </button>
            <button
              onClick={() => setMode("home")}
              className="text-gray-500 text-sm text-center hover:text-gray-300"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}