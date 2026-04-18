export default function CluePanel({ heroClue, heroineClue, movieFirstChar }) {
  if (!heroClue && !heroineClue && !movieFirstChar) return null;

  return (
    <div className="bg-gray-900 border border-yellow-400/30 rounded-xl px-6 py-2 flex gap-6 text-sm flex-wrap justify-center">
      {heroClue && (
        <div>
          <span className="text-yellow-400 font-bold">Hero starts with: </span>
          <span className="text-white font-black text-lg">{heroClue}</span>
        </div>
      )}
      {heroineClue && (
        <div>
          <span className="text-pink-400 font-bold">Heroine starts with: </span>
          <span className="text-white font-black text-lg">{heroineClue}</span>
        </div>
      )}
      {movieFirstChar && (
        <div>
          <span className="text-green-400 font-bold">Movie starts with: </span>
          <span className="text-white font-black text-lg">{movieFirstChar}</span>
        </div>
      )}
    </div>
  );
}