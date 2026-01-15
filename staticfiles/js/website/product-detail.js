// product-detail.js - Gestion de la page détail produit

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const mainImage = document.querySelector('.main-image img');
    const thumbnails = document.querySelectorAll('.thumbnail');
    const quantityInput = document.querySelector('.quantity-selector input');
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    const notifyStockBtn = document.querySelector('.notify-stock-btn');
    const colorOptions = document.querySelectorAll('.color-option');
    const storageOptions = document.querySelectorAll('.storage-option');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const shareBtn = document.querySelector('.share-btn');
    const stockAlertModal = document.getElementById('stockAlertModal');
    const shareModal = document.getElementById('shareModal');

    // État du produit
    let productState = {
        selectedColor: colorOptions.length > 0 ? colorOptions[0].title : null,
        selectedStorage: storageOptions.length > 0 ? storageOptions[0].textContent.trim() : null,
        quantity: 1
    };

    // Initialisation
    function init() {
        setupGallery();
        setupQuantityControls();
        setupProductOptions();
        setupTabs();
        setupShareFunctions();
        setupStockAlert();
    }

    // Gestion de la galerie d'images
    function setupGallery() {
        if (thumbnails.length > 0) {
            thumbnails.forEach(thumbnail => {
                thumbnail.addEventListener('click', function() {
                    // Mettre à jour l'image principale
                    const newSrc = this.querySelector('img').src;
                    mainImage.src = newSrc;
                    
                    // Mettre à jour la classe active
                    thumbnails.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');

                    // Animation de transition
                    mainImage.style.opacity = '0';
                    setTimeout(() => {
                        mainImage.style.opacity = '1';
                    }, 50);
                });
            });
        }

        if (mainImage) {
            mainImage.addEventListener('mousemove', function(e) {
                const bounds = this.getBoundingClientRect();
                const x = e.clientX - bounds.left;
                const y = e.clientY - bounds.top;
                
                const xPercent = Math.round(100 * (x / bounds.width));
                const yPercent = Math.round(100 * (y / bounds.height));
                
                this.style.transformOrigin = `${xPercent}% ${yPercent}%`;
            });

            mainImage.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.5)';
            });

            mainImage.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        }
    }

    // Gestion de la quantité
    function setupQuantityControls() {
        function updateQuantity(newValue) {
            const maxStock = parseInt(quantityInput.max);
            newValue = Math.max(1, Math.min(newValue, maxStock));
            quantityInput.value = newValue;
            productState.quantity = newValue;

            // Mettre à jour l'état des boutons
            minusBtn.disabled = newValue <= 1;
            plusBtn.disabled = newValue >= maxStock;
        }

        if (minusBtn && plusBtn && quantityInput) {
            minusBtn.addEventListener('click', () => {
                updateQuantity(parseInt(quantityInput.value) - 1);
            });

            plusBtn.addEventListener('click', () => {
                updateQuantity(parseInt(quantityInput.value) + 1);
            });

            quantityInput.addEventListener('change', function() {
                updateQuantity(parseInt(this.value));
            });

            // Initialisation
            updateQuantity(1);
        }
    }

    // Gestion des options de produit
    function setupProductOptions() {
        if (colorOptions.length > 0) {
            colorOptions.forEach(option => {
                option.addEventListener('click', function() {
                    colorOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    productState.selectedColor = this.title;
                });
            });
        }

        if (storageOptions.length > 0) {
            storageOptions.forEach(option => {
                option.addEventListener('click', function() {
                    storageOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    productState.selectedStorage = this.textContent.trim();
                });
            });
        }
    }

    // Gestion des onglets
    function setupTabs() {
        if (tabButtons.length > 0) {
            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const tabId = this.dataset.tab;
                    
                    // Mise à jour des classes actives
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    
                    this.classList.add('active');
                    document.getElementById(tabId).classList.add('active');
                });
            });
        }
    }

    // Gestion du partage
    function setupShareFunctions() {
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                if (shareModal) {
                    window.openModal(shareModal);
                }
            });
        }

        // Fonctions de partage
        window.share = function(platform) {
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            
            let shareUrl;
            switch(platform) {
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://api.whatsapp.com/send?text=${title}%20${url}`;
                    break;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        };

        window.copyLink = function() {
            navigator.clipboard.writeText(window.location.href)
                .then(() => {
                    window.showNotification('Lien copié dans le presse-papier');
                })
                .catch(() => {
                    window.showNotification('Erreur lors de la copie du lien', 'error');
                });
        };
    }

    // Gestion des alertes de stock
    function setupStockAlert() {
        if (notifyStockBtn) {
            notifyStockBtn.addEventListener('click', function() {
                if (stockAlertModal) {
                    window.openModal(stockAlertModal);
                }
            });
        }

        if (stockAlertModal) {
            const stockAlertForm = document.getElementById('stockAlertForm');
            
            stockAlertForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = this.querySelector('input[type="email"]').value;
                window.showNotification('Vous serez alerté lorsque le produit sera disponible');
                window.closeModal(stockAlertModal);
                this.reset();
            });
        }
    }

    // Gestion des favoris
    window.toggleFavorite = function(productId) {
        const btn = document.querySelector('.action-btn');
        const icon = btn.querySelector('i');
        
        if (icon.classList.contains('far')) {
            icon.classList.replace('far', 'fas');
            btn.textContent = 'Retirer des favoris';
            window.showNotification('Ajouté aux favoris');
        } else {
            icon.classList.replace('fas', 'far');
            btn.textContent = 'Ajouter aux favoris';
            window.showNotification('Retiré des favoris');
        }
    };

    // Initialiser le module
    init();
});