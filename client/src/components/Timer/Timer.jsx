export default function Timer({ timeLeft, drawTime }) {
    const pct = (timeLeft / drawTime) * 100;
    const color = timeLeft > 30 ? "bg-green-400" : timeLeft > 10 ? "bg-yellow-400" : "bg-red-500";
  
    return (
      <div className="flex items-center gap-2">
        <span className={`font-black text-lg ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-white"}`}>
          {timeLeft}s
        </span>
        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }