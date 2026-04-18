const https = require("https");

const TMDB_BASE = "https://api.themoviedb.org/3";

const LANGUAGE_CODES = {
  telugu: "te",
  hindi: "hi",
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Request timed out after 10s"));
    }, 10000);

    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

async function fetchMoviesForLanguage(language, totalPages = 5) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ No TMDB_API_KEY found");
    return null;
  }

  const langCode = LANGUAGE_CODES[language];
  if (!langCode) {
    console.warn(`⚠️ Unknown language: ${language}`);
    return null;
  }

  const movies = [];

  for (let page = 1; page <= totalPages; page++) {
    try {
      const url = `${TMDB_BASE}/discover/movie?api_key=${apiKey}&with_original_language=${langCode}&sort_by=popularity.desc&page=${page}&vote_count.gte=50`;
      const data = await httpsGet(url);

      for (const movie of data.results || []) {
        try {
          // Skip movies without release date or title
          if (!movie.title || !movie.release_date) continue;

          const creditsUrl = `${TMDB_BASE}/movie/${movie.id}/credits?api_key=${apiKey}`;
          const credits = await httpsGet(creditsUrl);
          const cast = credits.cast || [];

          // Find hero (male lead) and heroine (female lead)
          const hero = cast.find(
            (c) => c.known_for_department === "Acting" && c.gender === 2 && c.order < 5
          );
          const heroine = cast.find(
            (c) => c.known_for_department === "Acting" && c.gender === 1 && c.order < 5
          );

          if (!hero || !heroine) continue;

          // Difficulty from popularity
          let difficulty = "hard";
          if (movie.popularity > 50) difficulty = "easy";
          else if (movie.popularity > 20) difficulty = "medium";

          // Decade from release year
          const year = parseInt(movie.release_date.split("-")[0]);
          let decade = "2020s";
          if (year < 2000) decade = "1990s";
          else if (year < 2010) decade = "2000s";
          else if (year < 2020) decade = "2010s";

          movies.push({
            title: movie.title,
            hero: hero.name,
            heroine: heroine.name,
            decade,
            difficulty,
            popularity: movie.popularity,
            year,
            language,
          });
        } catch (e) {
          continue;
        }
      }

      console.log(`📽️ [${language}] Page ${page}/${totalPages} — ${movies.length} movies`);

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      console.error(`❌ Failed page ${page}:`, e.message);
    }
  }

  console.log(`✅ [${language}] Total: ${movies.length} movies fetched`);
  return movies;
}

module.exports = { fetchMoviesForLanguage };