// products.js - Gestion de la page de liste des produits

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const filterCheckboxes = document.querySelectorAll('.filter-options input[type="checkbox"]');
    const priceSlider = document.querySelector('.price-slider');
    const priceMin = document.querySelector('.price-min');
    const priceMax = document.querySelector('.price-max');
    const sortSelect = document.getElementById('sortSelect');
    const searchInput = document.getElementById('searchInput');
    const productsGrid = document.querySelector('.products-grid');
    const productsCount = document.querySelector('.products-count');
    const resetFiltersBtn = document.querySelector('.reset-filters');
    const notifyStockBtns = document.querySelectorAll('.notify-stock-btn');
    const stockAlertModal = document.getElementById('stockAlertModal');
    const stockAlertForm = document.getElementById('stockAlertForm');

    // État initial des filtres
    let filters = {
        categories: new Set(),
        priceRange: { min: 0, max: 999999 },
        sort: 'popularity',
        search: '',
        stockStatus: new Set(['in-stock', 'out-of-stock'])
    };

    // Initialisation
    function init() {
        // Gestionnaires d'événements pour les filtres de catégorie
        document.querySelectorAll('.filter-options input[type="checkbox"][data-type="category"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const category = this.value;
                if (this.checked) {
                    filters.categories.add(category);
                } else {
                    filters.categories.delete(category);
                }
                applyFilters();
            });
        });

        // Gestionnaires d'événements pour les filtres de stock
        document.querySelectorAll('.filter-options input[type="checkbox"][data-type="stock"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const stockStatus = this.value;
                if (this.checked) {
                    filters.stockStatus.add(stockStatus);
                } else {
                    filters.stockStatus.delete(stockStatus);
                }
                applyFilters();
            });
        });

        // Gestion du slider de prix et des inputs
        setupPriceFilter();
        
        // Gestion de la recherche
        setupSearch();
        
        // Gestion du tri
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                filters.sort = this.value;
                applySorting();
            });
        }
        
        // Réinitialisation des filtres
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', resetFilters);
        }
        
        // Gestion des alertes de stock
        setupStockAlerts();
        
        // Afficher tous les produits au chargement
        showAllProducts();
    }

    // Configuration du filtre de prix
    function setupPriceFilter() {
        let priceTimeout;
        const handlePriceChange = () => {
            clearTimeout(priceTimeout);
            priceTimeout = setTimeout(() => {
                const minValue = parseInt(priceMin.value) || 0;
                const maxValue = parseInt(priceMax.value) || 999999;
                filters.priceRange.min = minValue;
                filters.priceRange.max = maxValue;
                applyFilters();
            }, 300);
        };

        if (priceSlider) {
            priceSlider.addEventListener('input', function() {
                priceMax.value = this.value;
                handlePriceChange();
            });
        }

        if (priceMin) priceMin.addEventListener('input', handlePriceChange);
        if (priceMax) priceMax.addEventListener('input', handlePriceChange);
    }

    // Configuration de la recherche
    function setupSearch() {
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    filters.search = this.value.toLowerCase();
                    
                    if (!this.value) {
                        filters.search = '';
                        showAllProducts();
                    } else {
                        applyFilters();
                    }
                }, 300);
            });
        }
    }

    // Configuration des alertes de stock
    function setupStockAlerts() {
        // Ouvrir le modal d'alerte de stock
        notifyStockBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = this.dataset.productId;
                const productName = this.closest('.product-card').querySelector('h3').textContent;
                if (stockAlertModal) {
                    stockAlertModal.querySelector('p').textContent = 
                        `Recevez une notification dès que ${productName} sera de nouveau disponible.`;
                    window.openModal(stockAlertModal);
                }
            });
        });

        // Gérer le formulaire d'alerte de stock
        if (stockAlertForm) {
            stockAlertForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = this.querySelector('input[type="email"]').value;
                window.showNotification('Vous serez notifié dès que le produit sera disponible');
                window.closeModal(stockAlertModal);
                this.reset();
            });
        }
    }

    // Fonction principale pour appliquer les filtres
    function applyFilters() {
        const products = document.querySelectorAll('.product-card');
        let visibleCount = 0;

        products.forEach(product => {
            let isVisible = true;

            // Filtre par catégorie
            if (filters.categories.size > 0) {
                const productCategory = product.dataset.category;
                isVisible = filters.categories.has(productCategory);
            }

            // Filtre par prix
            if (isVisible && (filters.priceRange.min > 0 || filters.priceRange.max < 999999)) {
                const price = parseFloat(product.dataset.price);
                isVisible = price >= filters.priceRange.min && price <= filters.priceRange.max;
            }

            // Filtre par stock
            if (isVisible && filters.stockStatus.size > 0) {
                const inStock = parseInt(product.dataset.stock) > 0;
                const stockStatus = inStock ? 'in-stock' : 'out-of-stock';
                isVisible = filters.stockStatus.has(stockStatus);
            }

            // Filtre par recherche
            if (isVisible && filters.search) {
                const productName = product.querySelector('h3').textContent.toLowerCase();
                const productDescription = product.querySelector('.product-description')?.textContent.toLowerCase() || '';
                isVisible = productName.includes(filters.search) || productDescription.includes(filters.search);
            }

            // Appliquer la visibilité
            product.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });

        updateProductCount(visibleCount);

        if (filters.sort !== 'popularity') {
            applySorting();
        }

        if (visibleCount === 0 && !isAnyFilterActive()) {
            showAllProducts();
        }
    }

    // Fonction de tri
    function applySorting() {
        const products = Array.from(document.querySelectorAll('.product-card')).filter(
            product => product.style.display !== 'none'
        );
        
        products.sort((a, b) => {
            switch (filters.sort) {
                case 'price-asc':
                    return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
                case 'price-desc':
                    return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
                case 'newest':
                    return new Date(b.dataset.date) - new Date(a.dataset.date);
                case 'rating':
                    return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
                default:
                    return 0;
            }
        });

        productsGrid.innerHTML = '';
        products.forEach(product => productsGrid.appendChild(product));
    }

    // Vérifier si des filtres sont actifs
    function isAnyFilterActive() {
        return filters.categories.size > 0 ||
               filters.priceRange.min > 0 ||
               filters.priceRange.max < 999999 ||
               filters.search !== '' ||
               filters.sort !== 'popularity' ||
               filters.stockStatus.size !== 2;
    }

    // Afficher tous les produits
    function showAllProducts() {
        const products = document.querySelectorAll('.product-card');
        products.forEach(product => product.style.display = '');
        updateProductCount(products.length);
    }

    // Mise à jour du compteur de produits
    function updateProductCount(count) {
        if (productsCount) {
            productsCount.textContent = `${count} produit${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}`;
        }
    }

    // Réinitialisation des filtres
    function resetFilters() {
        filterCheckboxes.forEach(checkbox => checkbox.checked = true);
        
        if (priceSlider) priceSlider.value = 1000;
        if (priceMin) priceMin.value = '';
        if (priceMax) priceMax.value = 1000;
        
        if (sortSelect) sortSelect.value = 'popularity';
        if (searchInput) searchInput.value = '';
        
        filters = {
            categories: new Set(),
            priceRange: { min: 0, max: 999999 },
            sort: 'popularity',
            search: '',
            stockStatus: new Set(['in-stock', 'out-of-stock'])
        };
        
        showAllProducts();
    }

    // Démarrer l'initialisation
    init();
});