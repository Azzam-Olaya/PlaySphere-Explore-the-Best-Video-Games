const API_URL = "https://debuggers-games-api.duckdns.org/api/games";
const GAMES_PER_PAGE = 32;

// État de l'application
let allGames = [];
let filteredGames = [];
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
let currentView = 'games'; // 'games' ou 'favorites'
let genres = new Set();
let platforms = new Set();

// Éléments DOM
const gameCardsContainer = document.getElementById("gameCards");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");
const searchInput = document.getElementById("searchInput");
const filterGenre = document.getElementById("filterGenre");
const filterPlatform = document.getElementById("filterPlatform");
const filterRating = document.getElementById("filterRating");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const favoriteBtn = document.getElementById("favoriteBtn");
const favoritesSection = document.getElementById("favoritesSection");
const gamesSection = document.getElementById("gamesSection");
const gameModal = document.getElementById("gameModal");
const closeModal = document.getElementById("closeModal");
const modalContent = document.getElementById("modalContent");
const themeToggle = document.getElementById("themeToggle");
const darkIcon = document.getElementById("darkIcon");
const lightIcon = document.getElementById("lightIcon");


// Chargement des jeux depuis l'API
async function fetchGames(page = 1, append = false) {
    if (isLoading && !append) return;

    try {
        if (!append) {
            isLoading = true;
            showLoader();
            hideError();
        }

        const url = `${API_URL}?page=${page}&limit=100`; // Charger plus de jeux pour avoir plus de données à filtrer
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (page === 1 || !append) {
            allGames = data.results || [];
        } else {
            allGames = [...allGames, ...(data.results || [])];
        }

        filteredGames = [...allGames];
        totalPages = data.totalPages || 1;
        currentPage = page;

        displayGames(allGames);

        if (!append) {
            hideLoader();
        }


    } catch (error) {
        console.error('Erreur lors du chargement des jeux:', error);
        if (!append) {
            showError();
            hideLoader();
        }
    } finally {
        isLoading = false;
    }
}


// Charger plus de jeux (infinite scroll)
async function loadMoreGames() {
    if (currentPage >= totalPages || isLoading) return;
    const nextPage = Math.floor(allGames.length / 100) + 1;
    if (nextPage > totalPages) return;
    await fetchGames(nextPage, true);
    
}


// Affichage des jeux
function displayGames(games) {
    if (!gameCardsContainer) return;

    if (games.length === 0) {
        const hasFilters = (filterGenre?.value && filterGenre.value !== 'all') ||
            (filterPlatform?.value && filterPlatform.value !== 'all') ||
            (searchInput?.value && searchInput.value.trim() !== '');

        gameCardsContainer.innerHTML = `
            <div class="col-span-full text-center text-gray-400 py-12">
                <p class="text-xl mb-2">No games found.</p>
                ${hasFilters ? '<p class="text-sm">Try modifying your filters or search.</p>' : ''}
            </div>
        `;
        return;
    }

    gameCardsContainer.innerHTML = games.map(game => createGameCard(game)).join('');

    // Ajouter les événements aux cartes
    games.forEach((game, index) => {
        const card = gameCardsContainer.children[index];
        if (card) {
            const favoriteBtn = card.querySelector('.favorite-btn');
            const detailBtn = card.querySelector('.detail-btn');

            favoriteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(game);
            });

            detailBtn?.addEventListener('click', () => showGameDetails(game));

            // Clic sur la carte pour ouvrir les détails
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    showGameDetails(game);
                }
            });
        }
    });
}

// Création d'une carte de jeu
function createGameCard(game) {
    const mainPlatform = game.platforms?.[0]?.platform?.name || 'Unknown';
    const mainGenre = game.genres?.[0]?.name || 'Unknown';
    const rating = game.rating?.toFixed(1) || 'N/A';
    const releaseDate = game.released ? new Date(game.released).getFullYear() : 'N/A';
    const imageUrl = game.background_image || 'https://via.placeholder.com/400x300?text=No+Image';

    return `
        <div class="relative bg-[#2b1c59] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition duration-300 cursor-pointer detail-btn">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(game.name || '')}" 
                class="w-full h-56 object-cover" 
                onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            <div class="p-4 space-y-2">
                <h3 class="text-lg font-semibold line-clamp-2">${escapeHtml(game.name || 'Unknown')}</h3>
                <p class="text-sm text-gray-300">${escapeHtml(mainGenre)} | ${releaseDate}</p>
                <div class="flex items-center justify-between text-sm mt-2">
                    <span class="bg-[#9E1999] px-2 py-1 rounded-md text-xs">${escapeHtml(mainPlatform)}</span>
                    <span class="text-yellow-400 flex items-center">
                        <span class="material-icons text-base mr-1">star</span> ${rating}
                    </span>
                </div>
          </button>
            </div>
        </div>
    `;
}

fetchGames();

// Fonction pour échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// Utilitaires UI
function showLoader() {
    if (loader) loader.classList.remove('hidden');
    if (gameCardsContainer) gameCardsContainer.innerHTML = '';
}

function hideLoader() {
    if (loader) loader.classList.add('hidden');
}

function showError() {
    if (errorMessage) errorMessage.classList.remove('hidden');
}

function hideError() {
    if (errorMessage) errorMessage.classList.add('hidden');
}

//  SEARCH SYSTEM

searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();

    // Si rien écrit → afficher tout
    if (value === "") {
        filteredGames = [...allGames];
    } else {
        filteredGames = allGames.filter(game =>
            (game.name && game.name.toLowerCase().includes(value)) ||
            (game.genres && game.genres.some(g => g.name?.toLowerCase().includes(value))) ||
            (game.platforms && game.platforms.some(p => p.platform?.name?.toLowerCase().includes(value)))
        );
    }

    displayGames(filteredGames);
});


//  FILTER BY GENRE

filterGenre?.addEventListener('change', () => {
    currentPage = 1; // Réinitialiser à la page 1
    applyFilters();  // Appliquer les filtres existants
});

// Fonction pour remplir automatiquement le select Genre
function populateGenreFilter() {
    if (!filterGenre || !allGames.length) return;

    // Récupérer tous les genres uniques
    const genreSet = new Set();
    allGames.forEach(game => {
        game.genres?.forEach(g => genreSet.add(g.name));
    });

    // Réinitialiser le select
    const allOption = filterGenre.querySelector('option[value="all"]');
    filterGenre.innerHTML = '';
    if (allOption) filterGenre.appendChild(allOption);

    // Ajouter les genres
    Array.from(genreSet).sort().forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        filterGenre.appendChild(option);
    });
}

// Appeler populateGenreFilter après avoir chargé les jeux
fetchGames().then(() => populateGenreFilter());


//  FILTER BY PLATFORM
filterPlatform?.addEventListener('change', () => {
    currentPage = 1; // Réinitialiser à la page 1
    applyFilters();  // Appliquer tous les filtres
});

// Fonction pour remplir automatiquement le select Platform
function populatePlatformFilter() {
    if (!filterPlatform || !allGames.length) return;

    // Récupérer toutes les plateformes uniques
    const platformSet = new Set();
    allGames.forEach(game => {
        game.platforms?.forEach(p => {
            const name = p.platform?.name;
            if (name) {
                // Simplifier les noms de plateformes
                if (name.includes('PlayStation')) platformSet.add('PlayStation');
                else if (name.includes('Xbox')) platformSet.add('Xbox');
                else if (name.includes('Nintendo Switch') || name.includes('Switch')) platformSet.add('Switch');
                else if (name === 'PC' || name.includes('PC')) platformSet.add('PC');
                else platformSet.add(name);
            }
        });
    });

    // Réinitialiser le select
    const allOption = filterPlatform.querySelector('option[value="all"]');
    filterPlatform.innerHTML = '';
    if (allOption) filterPlatform.appendChild(allOption);

    // Ajouter les plateformes triées
    Array.from(platformSet).sort().forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        option.textContent = platform;
        filterPlatform.appendChild(option);
    });
}

// Appeler populatePlatformFilter après avoir chargé les jeux
fetchGames().then(() => populatePlatformFilter());



//  FILTER BY RATING

filterRating?.addEventListener('change', () => {
    currentPage = 1; // Réinitialiser à la page 1
    applyFilters();  // Appliquer tous les filtres
});

// Dans applyFilters(), ajouter après les autres filtres :
const ratingFilter = filterRating?.value;
if (ratingFilter === 'asc') {
    // Tri croissant : de la note la plus basse à la plus haute
    filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
} else if (ratingFilter === 'desc') {
    // Tri décroissant : de la note la plus haute à la plus basse
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

// Création d'une carte de jeu avec toutes les infos importantes
function createGameCard(game) {
    const isFavorite = isGameFavorite(game.id);
    const mainPlatform = game.platforms?.[0]?.platform?.name || 'Unknown';
    const mainGenre = game.genres?.[0]?.name || 'Unknown';
    const rating = game.rating?.toFixed(1) || 'N/A';
    const releaseDate = game.released ? new Date(game.released).getFullYear() : 'N/A';
    const imageUrl = game.background_image || 'https://via.placeholder.com/400x300?text=No+Image';

    return `
        <div class="relative bg-[#2b1c59] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition duration-300 cursor-pointer detail-btn">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(game.name || '')}" 
                class="w-full h-56 object-cover" 
                onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            <div class="p-4 space-y-2">
                <h3 class="text-lg font-semibold line-clamp-2">${escapeHtml(game.name || 'Unknown')}</h3>
                <p class="text-sm text-gray-300">${escapeHtml(mainGenre)} | ${releaseDate}</p>
                <div class="flex items-center justify-between text-sm mt-2">
                    <span class="bg-[#9E1999] px-2 py-1 rounded-md text-xs">${escapeHtml(mainPlatform)}</span>
                    <span class="text-yellow-400 flex items-center">
                        <span class="material-icons text-base mr-1">star</span> ${rating}
                    </span>
                </div>
                <button class="favorite-btn mt-3 w-full ${isFavorite ? 'bg-red-600 hover:bg-red-700' : 'bg-[#9E1999] hover:bg-[#c73fc2]'} text-white rounded-md py-2 transition flex items-center justify-center gap-1">
                    <span class="material-icons text-sm">${isFavorite ? 'favorite' : 'favorite_border'}</span> 
                    ${isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                </button>
            </div>
        </div>
    `;
}
 console.log();

 // Fonction pour basculer un jeu dans les favoris
function toggleFavorite(game) {
    const favorites = getFavorites(); // Récupérer la liste actuelle
    const index = favorites.findIndex(fav => fav.id === game.id);

    if (index > -1) {
        // Si déjà favori => retirer
        favorites.splice(index, 1);
    } else {
        // Ajouter aux favoris
        favorites.push(game);
    }

    saveFavorites(favorites); // Sauvegarder dans localStorage

    // Mettre à jour l'affichage de la carte
    applyFilters(); // ré-applique les filtres pour mettre à jour le bouton
}

// Récupérer la liste des favoris depuis localStorage
function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

// Sauvegarder la liste des favoris
function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Vérifier si un jeu est déjà favori
function isGameFavorite(gameId) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.id === gameId);
}
games.forEach((game, index) => {
    const card = gameCardsContainer.children[index];
    if (card) {
        const favoriteBtn = card.querySelector('.favorite-btn');
        favoriteBtn?.addEventListener('click', (e) => {
            e.stopPropagation(); // empêcher d'ouvrir le détail du jeu
            toggleFavorite(game); // bascule favori
        });
    }
});


