import { useState } from "react";

export default function Options({ options, onGuess, locked, correct }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (option) => {
    if (locked || selected) return;
    setSelected(option);
    onGuess(option);
  };

  if (!options || options.length === 0) return null;

  return (
    <div className="w-full max-w-xl">
      <p className="text-gray-400 text-sm text-center mb-3">
        {locked
          ? correct
            ? "🎉 You guessed correctly!"
            : "❌ Wrong guess — locked out for this turn"
          : "🎬 Which movie is being drawn?"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={locked || !!selected}
            className={`py-4 px-4 rounded-xl font-bold text-sm transition border-2 ${
              selected === option
                ? correct
                  ? "bg-green-500 border-green-400 text-white"
                  : "bg-red-500 border-red-400 text-white"
                : locked || selected
                ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-800 border-gray-700 text-white hover:border-yellow-400 hover:bg-gray-700"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}