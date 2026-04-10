export default function CluePanel({ hero, heroine, movieFirstChar }) {
    return (
      <div className="bg-gray-900 border border-yellow-400/30 rounded-xl px-6 py-2 flex gap-6 text-sm flex-wrap justify-center">
        <div>
          <span className="text-yellow-400 font-bold">Hero: </span>
          <span className="tracking-widest font-mono text-white">{hero.split("").join(" ")}</span>
        </div>
        <div>
          <span className="text-pink-400 font-bold">Heroine: </span>
          <span className="tracking-widest font-mono text-white">{heroine.split("").join(" ")}</span>
        </div>
        {movieFirstChar && (
          <div>
            <span className="text-green-400 font-bold">Movie starts with: </span>
            <span className="tracking-widest font-mono text-white font-black text-lg">{movieFirstChar}</span>
          </div>
        )}
      </div>
    );
  }