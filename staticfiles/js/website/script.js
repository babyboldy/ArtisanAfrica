// script.js - Code commun pour toutes les pages

document.addEventListener('DOMContentLoaded', function() {
    // ====== NAVIGATION ET UI COMMUN ======
    initNavigation();
    initUserMenu();
    initCart();
    initNotifications();
    initModals();

    // ====== INITIALISATION DES FONCTIONS COMMUNES ======
    function initNavigation() {
        // Gestion du menu burger
        const burgerMenu = document.querySelector('.burger-menu');
        const navLinks = document.getElementById('nav-links');

        if (burgerMenu && navLinks) {
            burgerMenu.addEventListener('click', function() {
                this.classList.toggle('active');
                navLinks.classList.toggle('active');
                document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
            });

            // Fermer le menu en cliquant sur un lien
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    burgerMenu.classList.remove('active');
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                });
            });
        }
    }

    function initUserMenu() {
        // Gestion du menu utilisateur
        const userMenuToggle = document.querySelector('.user-menu > a');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuToggle && userDropdown) {
            userMenuToggle.addEventListener('click', function(e) {
                e.preventDefault();
                userDropdown.classList.toggle('show');
            });

            // Fermer le menu en cliquant en dehors
            document.addEventListener('click', function(e) {
                if (!userMenuToggle.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }
    }

    function initCart() {
        // Initialisation du panier
        window.cart = JSON.parse(localStorage.getItem('cart')) || [];
        updateCartCount();

        // Mise à jour du compteur du panier
        function updateCartCount() {
            const cartCount = document.querySelector('.cart-count');
            if (cartCount) {
                const count = window.cart.reduce((total, item) => total + item.quantity, 0);
                cartCount.textContent = count;
            }
        }

        // Fonction globale pour ajouter au panier
        window.addToCart = function(productId, name, price, image, stock = 0) {
            const existingItem = window.cart.find(item => item.id === productId);
            
            if (existingItem) {
                // Vérifier si l'ajout dépasserait le stock disponible
                if (existingItem.quantity >= stock) {
                    window.showNotification(`Il ne reste que ${stock} exemplaires de ce produit en stock.`, 'warning');
                    return;
                }
                existingItem.quantity += 1;
            } else {
                // Vérifier si le stock est disponible
                if (stock <= 0) {
                    window.showNotification('Ce produit est en rupture de stock.', 'error');
                    return;
                }
                window.cart.push({
                    id: productId,
                    name: name,
                    price: parseFloat(price),
                    image: image,
                    quantity: 1,
                    stock: stock
                });
            }

            localStorage.setItem('cart', JSON.stringify(window.cart));
            updateCartCount();
            window.showNotification(`${name} a été ajouté au panier`);
            animateAddToCart();
        };

        // Animation d'ajout au panier
        function animateAddToCart() {
            const cartIcon = document.querySelector('.cart-icon');
            if (cartIcon) {
                cartIcon.classList.add('bounce');
                setTimeout(() => cartIcon.classList.remove('bounce'), 500);
            }
        }
    }

    function initNotifications() {
        // Création de l'élément de notification s'il n'existe pas
        if (!document.getElementById('notification')) {
            const notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            notification.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span id="notification-message"></span>
                <button class="close-notification">
                    <i class="fas fa-times"></i>
                </button>
            `;
            document.body.appendChild(notification);
            
            // Fermeture de la notification
            notification.querySelector('.close-notification').addEventListener('click', function() {
                notification.style.display = 'none';
            });
        }
        
        // Rendre la fonction showNotification globale
        window.showNotification = function(message, type = 'success') {
            const notification = document.getElementById('notification');
            if (!notification) return;

            const messageSpan = notification.querySelector('#notification-message');
            if (messageSpan) messageSpan.textContent = message;
            
            // Gérer les différentes classes de couleur selon le type
            notification.className = `notification ${type}`;
            
            // Ajouter l'icône appropriée selon le type
            const icon = notification.querySelector('i:first-child');
            if (icon) {
                icon.className = type === 'success' ? 'fas fa-check-circle' : 
                                type === 'warning' ? 'fas fa-exclamation-triangle' :
                                'fas fa-times-circle';
            }
            
            notification.style.display = 'flex';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        };
    }

    function initModals() {
        // Fonctions globales pour les modals
        window.openModal = function(modal) {
            if (!modal) return;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        };

        window.closeModal = function(modal) {
            if (!modal) return;
            modal.style.display = 'none';
            document.body.style.overflow = '';
        };

        // Fermer les modals en cliquant sur la croix
        document.querySelectorAll('.modal .close, .modal .close-modal').forEach(button => {
            button.addEventListener('click', function() {
                window.closeModal(this.closest('.modal'));
            });
        });

        // Fermer les modals en cliquant en dehors
        window.addEventListener('click', function(event) {
            if (event.target.classList.contains('modal')) {
                window.closeModal(event.target);
            }
        });
    }

    // Ajouter une classe pour indiquer que JavaScript est activé
    document.body.classList.add('js-enabled');
});

