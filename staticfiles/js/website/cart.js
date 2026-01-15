// cart.js - Gestion de la page panier

document.addEventListener('DOMContentLoaded', function() {
    const cartItemsContainer = document.querySelector('.cart-items');
    const subtotalElement = document.querySelector('.subtotal');
    const totalElement = document.querySelector('.total');
    const promoCodeInput = document.getElementById('promoCode');
    const applyPromoBtn = document.querySelector('.apply-promo');
    const checkoutBtn = document.querySelector('.checkout-btn');

    // Initialisation
    function init() {
        loadCartItems();
        setupEventListeners();
    }

    // Charger les articles du panier
    function loadCartItems() {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        if (cart.length === 0) {
            renderEmptyCart();
            return;
        }

        renderCartItems(cart);
        updateTotals(cart);
    }

    // Afficher le panier vide
    function renderEmptyCart() {
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h2>Votre panier est vide</h2>
                    <p>Découvrez nos produits et commencez votre shopping</p>
                    <a href="/products/" class="start-shopping">Commencer les achats</a>
                </div>
            `;
            document.querySelector('.cart-summary').style.display = 'none';
        }
    }

    // Afficher les articles du panier
    function renderCartItems(cart) {
        if (!cartItemsContainer) return;
        
        let cartHTML = `
            <div class="cart-header">
                <div class="product-info-header">Produit</div>
                <div class="quantity-header">Quantité</div>
                <div class="price-header">Prix</div>
                <div class="total-header">Total</div>
                <div class="remove-header"></div>
            </div>
        `;

        cart.forEach(item => {
            cartHTML += `
                <div class="cart-item" data-id="${item.id}" data-stock="${item.stock || 999}">
                    <div class="product-info">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="product-details">
                            <h3>${item.name}</h3>
                            ${item.options ? `
                                <div class="product-options">
                                    ${Object.entries(item.options).map(([key, value]) => 
                                        `<span class="option">${key}: ${value}</span>`
                                    ).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${item.stock || 999}">
                        <button class="quantity-btn plus" ${item.quantity >= (item.stock || 999) ? 'disabled' : ''}>+</button>
                    </div>
                    <div class="price">${formatPrice(item.price)}</div>
                    <div class="total">${formatPrice(item.price * item.quantity)}</div>
                    <button class="remove-btn" data-id="${item.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        cartItemsContainer.innerHTML = cartHTML;
        document.querySelector('.cart-summary').style.display = 'block';
    }

    // Configurer les écouteurs d'événements
    function setupEventListeners() {
        // Écouter les événements sur les boutons de quantité
        if (cartItemsContainer) {
            cartItemsContainer.addEventListener('click', function(e) {
                const target = e.target;
                
                // Bouton moins
                if (target.classList.contains('minus')) {
                    const cartItem = target.closest('.cart-item');
                    const itemId = cartItem.dataset.id;
                    updateQuantity(itemId, -1);
                }
                
                // Bouton plus
                if (target.classList.contains('plus')) {
                    const cartItem = target.closest('.cart-item');
                    const itemId = cartItem.dataset.id;
                    updateQuantity(itemId, 1);
                }
                
                // Bouton supprimer
                if (target.classList.contains('remove-btn') || target.closest('.remove-btn')) {
                    const removeBtn = target.classList.contains('remove-btn') ? target : target.closest('.remove-btn');
                    const itemId = removeBtn.dataset.id;
                    removeItem(itemId);
                }
            });
            
            // Écouter les changements directs de quantité
            cartItemsContainer.addEventListener('change', function(e) {
                if (e.target.classList.contains('quantity-input')) {
                    const cartItem = e.target.closest('.cart-item');
                    const itemId = cartItem.dataset.id;
                    const newQuantity = parseInt(e.target.value);
                    updateItemQuantity(itemId, newQuantity);
                }
            });
        }
        
        // Bouton appliquer code promo
        if (applyPromoBtn && promoCodeInput) {
            applyPromoBtn.addEventListener('click', function() {
                const promoCode = promoCodeInput.value.trim();
                if (promoCode) {
                    applyPromoCode(promoCode);
                }
            });
        }
        
        // Activer/désactiver le bouton de paiement
        if (checkoutBtn) {
            updateCheckoutButton();
        }
    }

    // Mettre à jour la quantité d'un article
    function updateQuantity(itemId, change) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const item = cart.find(item => item.id == itemId);
        
        if (item) {
            const newQuantity = item.quantity + change;
            // Vérifier si la nouvelle quantité est dans les limites du stock
            if (newQuantity >= 1) {
                if (newQuantity <= item.stock) {
                    item.quantity = newQuantity;
                    localStorage.setItem('cart', JSON.stringify(cart));
                    
                    // Mettre à jour l'affichage
                    const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
                    if (cartItem) {
                        const quantityInput = cartItem.querySelector('.quantity-input') || cartItem.querySelector('.quantity-display');
                        const minusBtn = cartItem.querySelector('.minus');
                        const plusBtn = cartItem.querySelector('.plus');
                        const totalElem = cartItem.querySelector('.total');
                        
                        if (quantityInput) {
                            quantityInput.value = newQuantity;
                            if (quantityInput.tagName === 'SPAN') {
                                quantityInput.textContent = newQuantity;
                            }
                        }
                        
                        if (minusBtn) minusBtn.disabled = newQuantity <= 1;
                        if (plusBtn) plusBtn.disabled = newQuantity >= item.stock;
                        if (totalElem) totalElem.textContent = formatPrice(item.price * newQuantity);
                    }
                    
                    updateTotals(cart);
                    window.showNotification('Quantité mise à jour');
                } else {
                    window.showNotification(`Il ne reste que ${item.stock} exemplaires de ce produit en stock.`, 'warning');
                }
            }
        }
    }

    // Définir une quantité spécifique
    function updateItemQuantity(itemId, newQuantity) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const item = cart.find(item => item.id == itemId);
        
        if (item) {
            if (newQuantity >= 1) {
                if (newQuantity <= item.stock) {
                    item.quantity = newQuantity;
                    localStorage.setItem('cart', JSON.stringify(cart));
                    
                    // Mettre à jour l'affichage
                    const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
                    if (cartItem) {
                        const minusBtn = cartItem.querySelector('.minus');
                        const plusBtn = cartItem.querySelector('.plus');
                        const totalElem = cartItem.querySelector('.total');
                        
                        if (minusBtn) minusBtn.disabled = newQuantity <= 1;
                        if (plusBtn) plusBtn.disabled = newQuantity >= item.stock;
                        if (totalElem) totalElem.textContent = formatPrice(item.price * newQuantity);
                    }
                    
                    updateTotals(cart);
                    window.showNotification('Quantité mise à jour');
                } else {
                    // Réinitialiser à une valeur valide
                    const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
                    if (cartItem) {
                        const quantityInput = cartItem.querySelector('.quantity-input');
                        if (quantityInput) quantityInput.value = item.quantity;
                    }
                    window.showNotification(`Il ne reste que ${item.stock} exemplaires de ce produit en stock.`, 'warning');
                }
            } else {
                // Quantité minimale de 1
                const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
                if (cartItem) {
                    const quantityInput = cartItem.querySelector('.quantity-input');
                    if (quantityInput) quantityInput.value = item.quantity;
                }
                window.showNotification('La quantité doit être au moins de 1', 'error');
            }
        }
    }

    // Supprimer un article
    function removeItem(itemId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const itemName = cart.find(item => item.id == itemId)?.name || 'Article';
            
            // Supprimer avec animation
            const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
            if (cartItem) {
                cartItem.classList.add('removing');
                setTimeout(() => {
                    // Filtrer le panier
                    cart = cart.filter(item => item.id != itemId);
                    localStorage.setItem('cart', JSON.stringify(cart));
                    
                    // Mettre à jour l'affichage
                    if (cart.length === 0) {
                        renderEmptyCart();
                    } else {
                        cartItem.remove();
                        updateTotals(cart);
                    }
                    
                    window.showNotification(`${itemName} supprimé du panier`);
                }, 300);
            }
        }
    }

    // Appliquer un code promo
    function applyPromoCode(code) {
        // Simuler l'application d'un code promo
        if (code.toUpperCase() === 'WELCOME') {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const discount = 0.1; // 10% de réduction
            
            updateTotals(cart, discount);
            window.showNotification('Code promo appliqué : 10% de réduction');
            
            // Désactiver l'input et le bouton
            if (promoCodeInput) promoCodeInput.disabled = true;
            if (applyPromoBtn) applyPromoBtn.disabled = true;
        } else {
            window.showNotification('Code promo invalide', 'error');
        }
    }

    // Mettre à jour les totaux
    function updateTotals(cart, discount = 0) {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = subtotal * discount;
        const total = subtotal - discountAmount;
        
        if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
        if (totalElement) totalElement.textContent = formatPrice(total);
        
        // Afficher le montant de la remise si elle existe
        const discountLine = document.querySelector('.discount-line');
        if (discount > 0) {
            if (!discountLine) {
                const discountHTML = `
                    <div class="summary-line discount-line">
                        <span>Remise</span>
                        <span class="discount">-${formatPrice(discountAmount)}</span>
                    </div>
                `;
                subtotalElement.closest('.summary-line').insertAdjacentHTML('afterend', discountHTML);
            } else {
                discountLine.querySelector('.discount').textContent = `-${formatPrice(discountAmount)}`;
            }
        } else if (discountLine) {
            discountLine.remove();
        }
        
        updateCheckoutButton();
    }

    // Activer/désactiver le bouton de paiement
    function updateCheckoutButton() {
        if (checkoutBtn) {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            checkoutBtn.disabled = cart.length === 0;
        }
    }

    // Formater un prix
    function formatPrice(price) {
        return `${price.toFixed(2)} F CFA`;
    }

    // Fonctions pour ajouter et gérer les produits dans le panier (utilisées sur d'autres pages)
    
    // Fonction pour ajouter un produit au panier
    window.addToCart = function(productData) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Vérifier si le produit existe déjà dans le panier avec les mêmes options
        const existingItemIndex = cart.findIndex(item => 
            item.id == productData.id && 
            JSON.stringify(item.options || {}) === JSON.stringify(productData.options || {})
        );
        
        if (existingItemIndex > -1) {
            // Mettre à jour la quantité si le produit existe déjà
            cart[existingItemIndex].quantity += (productData.quantity || 1);
        } else {
            // Ajouter un nouveau produit au panier
            cart.push({
                id: productData.id,
                name: productData.name,
                price: productData.price,
                image: productData.image,
                quantity: productData.quantity || 1,
                stock: productData.stock,
                options: productData.options || null,
                sku: productData.sku || null
            });
        }
        
        // Sauvegarder le panier mis à jour
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Mettre à jour l'affichage
        updateCartCount();
        
        return cart;
    };

    // Mise à jour du compteur du panier
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(element => {
            element.textContent = totalItems;
            element.classList.toggle('has-items', totalItems > 0);
        });
    }

    // Vider le panier
    window.clearCart = function() {
        localStorage.removeItem('cart');
        updateCartCount();
        if (cartItemsContainer) {
            renderEmptyCart();
        }
    };

    // Exposition des fonctions utiles
    window.getCartItems = function() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    };

    // Pour l'initialisation sur d'autres pages
    window.initCartFunctions = function() {
        updateCartCount();
    };
    
    // Démarrer l'initialisation pour la page panier
    init();
});