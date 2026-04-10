export default function PlayerList({ players, currentDrawer }) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Players</p>
        {players.map((p, i) => (
          <div
            key={p.name}
            className={`rounded-xl px-3 py-2 text-sm transition-all duration-500 ${
              p.name === currentDrawer
                ? "bg-yellow-400/10 border border-yellow-400/30"
                : "bg-gray-800"
            } ${p.disconnected ? "opacity-30 grayscale" : "opacity-100"}`}
          >
            <div className="flex items-center gap-2">
              <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎮"}</span>
              <span className="font-medium truncate">{p.name}</span>
              {p.disconnected && (
                <span className="ml-auto text-xs text-gray-500 animate-pulse">⚡</span>
              )}
            </div>
            <p className="text-yellow-400 font-black text-xs mt-1">{p.score} pts</p>
            {p.name === currentDrawer && !p.disconnected && (
              <p className="text-yellow-400 text-xs">✏️ Drawing</p>
            )}
          </div>
        ))}
      </div>
    );
  }