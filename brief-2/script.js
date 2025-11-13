// URL API
const API_URL = "https://debuggers-games-api.duckdns.org/api/games";

// DOM
const gameCards = document.getElementById("gameCards");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");

// helper simple pour échapper le texte
function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text ?? "";
  return d.innerHTML;
}

// afficher jeux (cartes simples)
function displayGames(games) {
  gameCards.innerHTML = "";
  games.forEach(g => {
    const img = g.background_image || g.thumbnail || "https://via.placeholder.com/400x300?text=No+Image";
    const title = g.name || g.title || "Untitled";
    const genre = (g.genres && g.genres[0] && g.genres[0].name) || g.genre || "";

    const card = document.createElement("div");
    card.className = "bg-[#2b1c59] rounded-2xl shadow-lg overflow-hidden hover:scale-105 transition duration-300 cursor-pointer animate-fadeIn";
    card.innerHTML = `
      <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" class="w-full h-56 object-cover" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
      <div class="p-4 space-y-1 text-center">
        <h3 class="text-lg font-semibold text-[#D71CD0]">${escapeHtml(title)}</h3>
        <p class="text-sm text-gray-300">${escapeHtml(genre)}</p>
      </div>
    `;
    gameCards.appendChild(card);
  });
}

// fetch minimal avec retry
async function fetchGames() {
  loader.classList.remove("hidden");
  errorMessage.classList.add("hidden");
  gameCards.innerHTML = "";
 
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    // parfois l'API renvoie { results: [...] } ou array direct
    const games = Array.isArray(data) ? data : (data.results || []);
    if (!games.length) {
      errorMessage.classList.remove("hidden");
      errorMessage.innerHTML = `<p>Aucun jeu trouvé.</p>`;
      return;
    }

    displayGames(games.slice(0, 24)); // affiche jusqu'à 24 jeux
  } catch (err) {
    console.error("fetch error:", err);
    errorMessage.classList.remove("hidden");
    errorMessage.innerHTML = `
      <p class="text-lg mb-4">Impossible de charger les jeux. Veuillez réessayer plus tard.</p>
      <button id="retryBtn" class="bg-[#9E1999] hover:bg-[#c73fc2] text-white px-4 py-2 rounded-md">Réessayer</button>
    `;
    document.getElementById("retryBtn")?.addEventListener("click", fetchGames);
  } finally {
    loader.classList.add("hidden");
  }
}

// lancer au chargement
document.addEventListener("DOMContentLoaded", fetchGames);
