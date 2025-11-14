// lien dyal data
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

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchGames();
    setupEventListeners();
});

// Gestion du thème
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        darkIcon.classList.add('hidden');
        lightIcon.classList.remove('hidden');
    }
}

themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    darkIcon.classList.toggle('hidden', isLight);
    lightIcon.classList.toggle('hidden', !isLight);
});

// Configuration des événements
function setupEventListeners() {
    searchInput?.addEventListener('input', debounce(handleSearch, 300));
    filterGenre?.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });
    filterPlatform?.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });
    filterRating?.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });
    prevPageBtn?.addEventListener('click', () => changePage(-1));
    nextPageBtn?.addEventListener('click', () => changePage(1));
    favoriteBtn?.addEventListener('click', toggleFavoritesView);
    closeModal?.addEventListener('click', () => gameModal.classList.add('hidden'));
    gameModal?.addEventListener('click', (e) => {
        if (e.target === gameModal) gameModal.classList.add('hidden');
    });

    // Bouton hero - scroll vers les jeux
    const heroBtn = document.getElementById('heroBtn');
    heroBtn?.addEventListener('click', () => {
        document.getElementById('gamesSection')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Logo - retour à la vue principale
    const logoBtn = document.getElementById('logoBtn');
    logoBtn?.addEventListener('click', () => {
        if (currentView === 'favorites') {
            toggleFavoritesView();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Fermer la modal avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !gameModal.classList.contains('hidden')) {
            gameModal.classList.add('hidden');
        }
    });

    // Infinite scroll
    let lastScrollTop = 0;
    let isLoadingMore = false;
    window.addEventListener('scroll', () => {
        if (currentView !== 'games' || isLoading || isLoadingMore) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const totalFilteredPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);

        // Infinite scroll : charger plus de données de l'API si on est près de la fin
        if (scrollTop + windowHeight >= documentHeight - 100) {
            // Si on a encore des pages API à charger
            if (currentPage < totalPages && filteredGames.length < 500) {
                isLoadingMore = true;
                loadMoreGames().finally(() => {
                    isLoadingMore = false;
                });
            }
            // Sinon, passer à la page suivante des résultats filtrés
            else if (currentPage < totalFilteredPages) {
                currentPage++;
                applyFilters();
            }
        }
        lastScrollTop = scrollTop;
    });
}

// Fonction debounce pour optimiser la recherche
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
            extractFiltersData(allGames);
            populateFilterOptions();
        } else {
            allGames = [...allGames, ...(data.results || [])];
            extractFiltersData(data.results || []);
            populateFilterOptions();
        }

        filteredGames = [...allGames];
        totalPages = data.totalPages || 1;
        currentPage = page;

        if (!append) {
            applyFilters();
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
    applyFilters();
}

// Extraire les genres et plateformes uniques
function extractFiltersData(games) {
    games.forEach(game => {
        if (game.genres && Array.isArray(game.genres)) {
            game.genres.forEach(genre => genres.add(genre.name));
        }
        if (game.platforms && Array.isArray(game.platforms)) {
            game.platforms.forEach(platform => {
                const platformName = platform.platform?.name;
                if (platformName) {
                    // Simplifier les noms de plateformes
                    if (platformName.includes('PlayStation')) platforms.add('PlayStation');
                    else if (platformName.includes('Xbox')) platforms.add('Xbox');
                    else if (platformName.includes('Nintendo Switch') || platformName.includes('Switch')) platforms.add('Switch');
                    else if (platformName === 'PC' || platformName.includes('PC')) platforms.add('PC');
                    else platforms.add(platformName);
                }
            });
        }
    });
}

// Remplir les options des filtres
function populateFilterOptions() {
    if (!filterGenre || !filterPlatform) return;

    // Récupérer les valeurs actuelles des filtres pour les restaurer après
    const currentGenreValue = filterGenre.value;
    const currentPlatformValue = filterPlatform.value;

    // Genres limités à 4 options principales
    const allowedGenres = ['Action', 'RPG', 'Adventure', 'Simulation'];

    // Réinitialiser et ajouter seulement les genres autorisés
    const allOption = filterGenre.options[0]; // Keep "All Genres"
    filterGenre.innerHTML = '';
    filterGenre.appendChild(allOption);

    // Ajouter les genres dans l'ordre défini
    allowedGenres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        filterGenre.appendChild(option);
    });

    // Plateformes limitées à 4 options principales
    const allowedPlatforms = ['PC', 'PlayStation', 'Xbox', 'Switch'];

    // Réinitialiser et ajouter seulement les plateformes autorisées
    const allPlatformOption = filterPlatform.options[0]; // Garder "All Platforms"
    filterPlatform.innerHTML = '';
    filterPlatform.appendChild(allPlatformOption);

    // Ajouter les plateformes dans l'ordre défini
    allowedPlatforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        option.textContent = platform;
        filterPlatform.appendChild(option);
    });

    // Restaurer les valeurs sélectionnées
    if (currentGenreValue && Array.from(filterGenre.options).some(opt => opt.value === currentGenreValue)) {
        filterGenre.value = currentGenreValue;
    }
    if (currentPlatformValue && Array.from(filterPlatform.options).some(opt => opt.value === currentPlatformValue)) {
        filterPlatform.value = currentPlatformValue;
    }
}

// Recherche
function handleSearch(e) {
    currentPage = 1; // Réinitialiser à la page 1 lors de la recherche
    applyFilters();
}

// Application des filtres
function applyFilters() {
    // S'assurer qu'on a des jeux à filtrer
    if (!allGames || allGames.length === 0) {
        return;
    }

    let filtered = [...allGames];

    // 1. Recherche par nom (si présente)
    const searchTerm = searchInput?.value?.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(game =>
            game.name?.toLowerCase().includes(searchTerm)
        );
    }

    // 2. Filtre par genre (cumulable avec la recherche)
    const selectedGenre = filterGenre?.value;
    if (selectedGenre && selectedGenre !== 'all') {
        filtered = filtered.filter(game => {
            if (!game.genres || !Array.isArray(game.genres)) return false;
            return game.genres.some(genre => genre.name === selectedGenre);
        });
    }

    // 3. Filtre par plateforme (cumulable avec les autres filtres)
    const selectedPlatform = filterPlatform?.value;
    if (selectedPlatform && selectedPlatform !== 'all') {
        filtered = filtered.filter(game => {
            if (!game.platforms || !Array.isArray(game.platforms)) return false;
            return game.platforms.some(platform => {
                const platformName = platform.platform?.name || '';
                // Gestion des différentes variantes de noms de plateformes
                if (selectedPlatform === 'PlayStation') {
                    return platformName.includes('PlayStation');
                }
                if (selectedPlatform === 'Xbox') {
                    return platformName.includes('Xbox');
                }
                if (selectedPlatform === 'Switch') {
                    return platformName.includes('Switch') || platformName.includes('Nintendo Switch');
                }
                if (selectedPlatform === 'PC') {
                    return platformName === 'PC' || platformName.includes('PC') || platformName === 'Windows';
                }
                return platformName === selectedPlatform;
            });
        });
    }

    // 4. Tri par note (appliqué après les filtres)
    const ratingFilter = filterRating?.value;
    if (ratingFilter === 'asc') {
        // Tri croissant : de la note la plus basse à la plus haute
        filtered.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            return ratingA - ratingB;
        });
    } else if (ratingFilter === 'desc') {
        // Tri décroissant : de la note la plus haute à la plus basse
        filtered.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            return ratingB - ratingA;
        });
    }

    // Mettre à jour filteredGames pour la pagination
    filteredGames = filtered;

    // Pagination
    const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
    const endIndex = startIndex + GAMES_PER_PAGE;
    const paginatedGames = filtered.slice(startIndex, endIndex);
    const totalFilteredPages = Math.ceil(filtered.length / GAMES_PER_PAGE);

    // Afficher les résultats
    displayGames(paginatedGames);
    updatePagination(totalFilteredPages, filtered.length);

    // Scroll vers le haut de la section des jeux seulement si on change de filtre (pas lors du scroll infini)
    // On vérifie si on est déjà dans la section des jeux
    const gamesSection = document.getElementById('gamesSection');
    if (currentPage === 1 && filtered.length > 0 && gamesSection) {
        const rect = gamesSection.getBoundingClientRect();
        // Si la section n'est pas visible, scroller vers elle
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            gamesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
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

// Gestion des favoris
function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function isGameFavorite(gameId) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.id === gameId);
}

// Gestion des notes utilisateur
function getUserRatings() {
    const ratings = localStorage.getItem('userRatings');
    return ratings ? JSON.parse(ratings) : {};
}

function saveUserRatings(ratings) {
    localStorage.setItem('userRatings', JSON.stringify(ratings));
}

function getUserRating(gameId) {
    const ratings = getUserRatings();
    return ratings[gameId] || null;
}

function saveUserRating(gameId, rating) {
    const ratings = getUserRatings();
    ratings[gameId] = rating;
    saveUserRatings(ratings);
}

function toggleFavorite(game) {
    const favorites = getFavorites();
    const index = favorites.findIndex(fav => fav.id === game.id);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(game);
    }

    saveFavorites(favorites);

    // Mettre à jour l'affichage
    if (currentView === 'games') {
        applyFilters();
    } else {
        displayFavorites();
    }
}

// Affichage de la vue favoris
function toggleFavoritesView() {
    if (currentView === 'games') {
        currentView = 'favorites';
        gamesSection.classList.add('hidden');
        favoritesSection.classList.remove('hidden');
        document.getElementById('sectionTitle').textContent = 'My Favorites';
        displayFavorites();
    } else {
        currentView = 'games';
        gamesSection.classList.remove('hidden');
        favoritesSection.classList.add('hidden');
        document.getElementById('sectionTitle').textContent = 'Explore by Genre, Platform, or Rating';
        applyFilters();
    }
}

function displayFavorites() {
    const favorites = getFavorites();
    const favoritesCards = document.getElementById("favoritesCards");
    const noFavorites = document.getElementById("noFavorites");

    if (favorites.length === 0) {
        favoritesCards.innerHTML = '';
        noFavorites.classList.remove('hidden');
        return;
    }

    noFavorites.classList.add('hidden');
    favoritesCards.innerHTML = favorites.map(game => createGameCard(game)).join('');

    // Ajouter les événements
    favorites.forEach((game, index) => {
        const card = favoritesCards.children[index];
        if (card) {
            const favoriteBtn = card.querySelector('.favorite-btn');
            const detailBtn = card.querySelector('.detail-btn');

            favoriteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(game);
            });

            detailBtn?.addEventListener('click', () => showGameDetails(game));

            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    showGameDetails(game);
                }
            });
        }
    });
}

// Modal de détails
function showGameDetails(game) {
    const isFavorite = isGameFavorite(game.id);
    const userRating = getUserRating(game.id);
    const genresList = game.genres?.map(g => g.name).join(', ') || 'Unknown';
    const platformsList = game.platforms?.map(p => p.platform?.name).filter(Boolean).join(', ') || 'Unknown';
    const developersList = game.developers?.map(d => d.name).join(', ') || 'Unknown';
    const publishersList = game.publishers?.map(p => p.name).join(', ') || 'Unknown';
    const rating = game.rating?.toFixed(1) || 'N/A';
    const releaseDate = game.released ? new Date(game.released).toLocaleDateString('fr-FR') : 'N/A';
    const description = game.description || 'No description available.';
    const imageUrl = game.background_image || 'https://via.placeholder.com/800x400?text=No+Image';
    const gameId = game.id;

    // Créer les étoiles pour la notation utilisateur
    const starsHtml = Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const isFilled = userRating && starValue <= userRating;
        return `
            <button class="star-rating-btn cursor-pointer hover:scale-110 transition-transform duration-200" data-rating="${starValue}" 
                aria-label="Rate ${starValue} star${starValue > 1 ? 's' : ''}"
                title="Rate ${starValue} star${starValue > 1 ? 's' : ''}">
                <span class="material-icons text-3xl transition-all duration-200 ${isFilled ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-300'
            }">${isFilled ? 'star' : 'star_border'}</span>
            </button>
        `;
    }).join('');

    modalContent.innerHTML = `
        <div class="space-y-6">
            <div class="flex flex-col md:flex-row gap-6">
                <img src="${imageUrl}" alt="${game.name}" 
                    class="w-full md:w-1/2 h-64 md:h-96 object-cover rounded-lg"
                    onerror="this.src='https://via.placeholder.com/800x400?text=No+Image'">
                <div class="flex-1 space-y-4">
                    <h2 class="text-3xl font-bold text-[#D71CD0]">${escapeHtml(game.name)}</h2>
                    <div class="flex items-center gap-2">
                        <span class="text-yellow-400 flex items-center text-xl">
                            <span class="material-icons">star</span> ${rating}
                        </span>
                        <span class="text-gray-400">|</span>
                        <span class="text-gray-300">${releaseDate}</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${game.genres?.map(genre =>
        `<span class="bg-[#9E1999] px-3 py-1 rounded-full text-sm">${escapeHtml(genre.name)}</span>`
    ).join('') || ''}
                    </div>
                    <div class="border-t border-gray-600 pt-4">
                        <h3 class="text-lg font-semibold mb-2 text-[#D71CD0]">Your Rating</h3>
                        <div class="flex items-center gap-1" id="starRatingContainer">
                            ${starsHtml}
                            ${userRating ? `<span class="ml-3 text-gray-300 font-medium">(${userRating}/5)</span>` : '<span class="ml-3 text-gray-400 text-sm">Click on a star to rate</span>'}
                        </div>
                        <div id="ratingMessage" class="mt-2 text-sm text-green-400 hidden"></div>
                    </div>
                    <button id="modalFavoriteBtn" data-game-id="${gameId}"
                        class="w-full ${isFavorite ? 'bg-red-600 hover:bg-red-700' : 'bg-[#9E1999] hover:bg-[#c73fc2]'} text-white rounded-md py-3 transition flex items-center justify-center gap-2">
                        <span class="material-icons">${isFavorite ? 'favorite' : 'favorite_border'}</span>
                        ${isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    </button>
                </div>
            </div>
            <div class="space-y-4">
                <div>
                    <h3 class="text-xl font-semibold mb-2 text-[#D71CD0]">Description</h3>
                    <p class="text-gray-300 leading-relaxed">${escapeHtml(description)}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-[#D71CD0] mb-1">Developers</h4>
                        <p class="text-gray-300">${escapeHtml(developersList)}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-[#D71CD0] mb-1">Publishers</h4>
                        <p class="text-gray-300">${escapeHtml(publishersList)}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-[#D71CD0] mb-1">Platforms</h4>
                        <p class="text-gray-300">${escapeHtml(platformsList)}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-[#D71CD0] mb-1">Genres</h4>
                        <p class="text-gray-300">${escapeHtml(genresList)}</p>
                    </div>
                </div>
                ${game.website ? `
                    <div>
                        <a href="${game.website}" target="_blank" 
                            class="inline-block bg-[#9E1999] hover:bg-[#c73fc2] text-white px-6 py-2 rounded-md transition">
                            Visit Official Website
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Ajouter l'événement au bouton favori dans la modal
    const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
    if (modalFavoriteBtn) {
        modalFavoriteBtn.addEventListener('click', () => {
            toggleFavorite(game);
            showGameDetails(game); // Rafraîchir la modal
        });
    }

    // Ajouter les événements aux étoiles de notation
    const starButtons = document.querySelectorAll('.star-rating-btn');
    starButtons.forEach((btn, index) => {
        const rating = index + 1;

        // Effet hover
        btn.addEventListener('mouseenter', () => {
            highlightStars(rating);
        });

        // Clic pour noter
        btn.addEventListener('click', () => {
            saveUserRating(gameId, rating);
            // Afficher le message de confirmation
            const ratingMessage = document.getElementById('ratingMessage');
            if (ratingMessage) {
                ratingMessage.textContent = `Thank you! You rated this game ${rating}/5 stars.`;
                ratingMessage.classList.remove('hidden');
            }
            // Rafraîchir la modal après un court délai pour montrer le message
            setTimeout(() => {
                showGameDetails(game);
            }, 1500);
        });
    });

    // Réinitialiser les étoiles au survol de la zone
    const starContainer = document.getElementById('starRatingContainer');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', () => {
            const currentRating = getUserRating(gameId);
            if (currentRating) {
                highlightStars(currentRating);
            } else {
                resetStars();
            }
        });
    }

    gameModal.classList.remove('hidden');
}

// Fonction pour mettre en surbrillance les étoiles
function highlightStars(rating) {
    const starButtons = document.querySelectorAll('.star-rating-btn');
    starButtons.forEach((btn, index) => {
        const starValue = index + 1;
        const starIcon = btn.querySelector('.material-icons');
        if (starValue <= rating) {
            starIcon.textContent = 'star';
            starIcon.classList.remove('text-gray-400', 'text-yellow-300');
            starIcon.classList.add('text-yellow-400');
        } else {
            starIcon.textContent = 'star_border';
            starIcon.classList.remove('text-yellow-400');
            starIcon.classList.add('text-gray-400');
        }
    });
}

// Fonction pour réinitialiser les étoiles
function resetStars() {
    const starButtons = document.querySelectorAll('.star-rating-btn');
    starButtons.forEach((btn) => {
        const starIcon = btn.querySelector('.material-icons');
        starIcon.textContent = 'star_border';
        starIcon.classList.remove('text-yellow-400');
        starIcon.classList.add('text-gray-400');
    });
}

// Fonction pour échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Pagination
function changePage(direction) {
    const totalFilteredPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalFilteredPages) {
        currentPage = newPage;
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updatePagination(totalPagesFiltered, totalGames) {
    if (!prevPageBtn || !nextPageBtn || !pageInfo) return;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPagesFiltered || totalPagesFiltered === 0;
    pageInfo.textContent = `Page ${currentPage} / ${totalPagesFiltered || 1} (${totalGames} jeux)`;
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
