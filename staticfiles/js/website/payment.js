// payment.js - Gestion de la page de paiement

document.addEventListener('DOMContentLoaded', function () {
    console.log('Initialisation de la page de paiement...');

    // Vider le panier si le cookie clear_cart est présent
    if (document.cookie.indexOf('clear_cart=true') > -1) {
        localStorage.removeItem('cart');
        // Mettre à jour le compteur du panier
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = '0';
        }
        // Supprimer le cookie après l'avoir utilisé
        document.cookie = 'clear_cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    // Éléments du DOM
    const paymentForm = document.getElementById('payment-form');
    const cardPaymentForm = document.getElementById('card-payment-form');
    const deliveryPaymentForm = document.getElementById('delivery-payment-form');
    const paymentMethods = document.querySelectorAll('input[name="payment_method"]');
    const payButton = document.querySelector('.pay-button');
    const cardNumberInput = document.getElementById('card_number');
    const cardTypeIcon = document.querySelector('.card-type-icon');
    const expiryMonth = document.getElementById('card_expiry_month');
    const expiryYear = document.getElementById('card_expiry_year');
    const cvvInput = document.getElementById('card_cvv');
    const orderItemsContainer = document.querySelector('.order-items');
    const savedAddressRadios = document.querySelectorAll('input[name="saved_shipping_address"]');
    const newAddressForm = document.querySelector('.new-address-form');

    // Constantes
    const SHIPPING_COST = 0; // Livraison gratuite
    const TAX_RATE = 0.20;   // TVA 20%

    // Regex pour la validation des cartes
    const cardPatterns = {
        visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
        mastercard: /^5[1-5][0-9]{14}$/,
        amex: /^3[47][0-9]{13}$/
    };

    // Initialisation
    function init() {
        loadCartItems();
        setupEventListeners();
        updatePaymentForm();
        restoreFormData();
    }

    // Configuration des écouteurs d'événements
    function setupEventListeners() {
        // Écouteur d'événements pour les méthodes de paiement
        if (paymentMethods) {
            paymentMethods.forEach(method => {
                method.addEventListener('change', function () {
                    updatePaymentForm();
                    updateButtonText();
                });
            });
        }

        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', handleCardNumberInput);
            cardNumberInput.addEventListener('keydown', preventNonNumeric);
        }
        if (expiryMonth) {
            expiryMonth.addEventListener('input', handleExpiryInput);
            expiryMonth.addEventListener('keydown', preventNonNumeric);
        }
        if (expiryYear) {
            expiryYear.addEventListener('input', handleExpiryInput);
            expiryYear.addEventListener('keydown', preventNonNumeric);
        }
        if (cvvInput) {
            cvvInput.addEventListener('input', handleCVVInput);
            cvvInput.addEventListener('keydown', preventNonNumeric);
        }
        if (savedAddressRadios) {
            savedAddressRadios.forEach(radio => {
                radio.addEventListener('change', toggleNewAddressForm);
            });
        }
        if (paymentForm) {
            // Ne pas utiliser l'événement 'submit' directement
            // À la place, ajouter un gestionnaire d'événements au bouton de soumission
            const submitButton = paymentForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    handleSubmit(e);
                });
            }

            paymentForm.addEventListener('input', debounce(autoSaveForm, 500));
        }
        setupTooltips();
        setupAlertDismissal();

        window.addEventListener('popstate', function (e) {
            if (e.state && e.state.paymentStep) {
                loadPaymentStep(e.state.paymentStep);
            }
        });

        // Mode test pour le développement local
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const testBanner = document.createElement('div');
            testBanner.className = 'test-mode-banner';
            testBanner.textContent = 'Mode Test - Aucune transaction réelle ne sera effectuée';
            document.body.insertBefore(testBanner, document.body.firstChild);

            if (cardNumberInput) cardNumberInput.value = '4242 4242 4242 4242';
            if (expiryMonth) expiryMonth.value = '12';
            if (expiryYear) expiryYear.value = '25';
            if (cvvInput) cvvInput.value = '123';
        }
    }

    // Charger les articles du panier et mettre à jour le récapitulatif
    function loadCartItems() {
        console.log('Chargement des articles du panier...');
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        console.log('Contenu du panier:', cart);

        let html = '';
        let subtotal = 0;
        cart.forEach(item => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            subtotal += itemTotal;
            html += `
                <div class="order-item">
                    <div class="item-image">
                        <img src="${item.image || '/api/placeholder/60/60'}" alt="${item.name}">
                    </div>
                    <div class="item-details">
                        <h3 class="item-name">${item.name}</h3>
                        ${item.options ? `<p class="item-options">${formatOptions(item.options)}</p>` : ''}
                        <div class="item-quantity">Quantité: ${item.quantity}</div>
                    </div>
                    <div class="item-price">${formatPrice(itemTotal)}</div>
                </div>
            `;
        });
        if (orderItemsContainer) {
            orderItemsContainer.innerHTML = html;
        }
        updatePriceDetails(subtotal);
    }

    // Formater les options pour affichage
    function formatOptions(options) {
        if (!options) return '';
        return Object.entries(options)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }

    function updatePriceDetails(subtotal) {
        const taxAmount = subtotal * TAX_RATE;
        const total = subtotal + taxAmount + SHIPPING_COST;
        const subtotalElem = document.querySelector('.subtotal');
        const taxElem = document.querySelector('.tax');
        const shippingElem = document.querySelector('.shipping');
        const totalElem = document.querySelector('.total-amount');

        if (subtotalElem) subtotalElem.textContent = formatPrice(subtotal);
        if (taxElem) taxElem.textContent = formatPrice(taxAmount);
        if (shippingElem) shippingElem.textContent = SHIPPING_COST === 0 ? 'Gratuite' : formatPrice(SHIPPING_COST);
        if (totalElem) totalElem.textContent = formatPrice(total);

        const subtotalInput = document.getElementById('subtotal-input');
        const taxInput = document.getElementById('tax-amount-input');
        const shippingInput = document.getElementById('shipping-cost-input');
        const totalInput = document.getElementById('total-amount-input');
        if (subtotalInput) subtotalInput.value = subtotal;
        if (taxInput) taxInput.value = taxAmount;
        if (shippingInput) shippingInput.value = SHIPPING_COST;
        if (totalInput) totalInput.value = total;

        updateButtonText();
    }

    // Fonction pour mettre à jour le texte du bouton selon le mode de paiement
    function updateButtonText() {
        if (payButton) {
            const selectedMethod = document.querySelector('input[name="payment_method"]:checked');
            const span = payButton.querySelector('span');
            const total = document.querySelector('.total-amount');

            if (span && selectedMethod && total) {
                if (selectedMethod.value === 'card') {
                    span.textContent = `Payer ${total.textContent}`;
                } else {
                    span.textContent = 'Valider la commande';
                }
            }
        }
    }

    // Fonction pour mettre à jour l'affichage du formulaire
    function updatePaymentForm() {
        const selectedMethod = document.querySelector('input[name="payment_method"]:checked');

        if (selectedMethod && cardPaymentForm && deliveryPaymentForm) {
            if (selectedMethod.value === 'card') {
                cardPaymentForm.style.display = 'block';
                deliveryPaymentForm.style.display = 'none';

                // Gérer les attributs required
                const cardFields = cardPaymentForm.querySelectorAll('input[required]');
                const deliveryFields = deliveryPaymentForm.querySelectorAll('input');

                cardFields.forEach(field => field.setAttribute('required', ''));
                deliveryFields.forEach(field => field.removeAttribute('required'));
            } else {
                cardPaymentForm.style.display = 'none';
                deliveryPaymentForm.style.display = 'block';

                // Gérer les attributs required
                const cardFields = cardPaymentForm.querySelectorAll('input');
                const deliveryFields = deliveryPaymentForm.querySelectorAll('input[required]');

                cardFields.forEach(field => field.removeAttribute('required'));
                deliveryFields.forEach(field => field.setAttribute('required', ''));
            }

            // Mettre à jour le texte du bouton
            updateButtonText();
        }
    }

    function handleCardNumberInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        e.target.value = formattedValue;
        detectCardType(value);
    }

    function detectCardType(number) {
        if (cardTypeIcon) {
            cardTypeIcon.className = 'card-type-icon fab';
            if (cardPatterns.visa.test(number)) {
                cardTypeIcon.classList.add('fa-cc-visa');
            } else if (cardPatterns.mastercard.test(number)) {
                cardTypeIcon.classList.add('fa-cc-mastercard');
            } else if (cardPatterns.amex.test(number)) {
                cardTypeIcon.classList.add('fa-cc-amex');
            } else {
                cardTypeIcon.classList.add('fa-credit-card');
            }
        }
    }

    function handleExpiryInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (e.target === expiryMonth) {
            if (parseInt(value) > 12) {
                value = '12';
            }
            if (value.length === 2) {
                expiryYear.focus();
            }
        }
        e.target.value = value;
    }

    function handleCVVInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value;
    }

    function preventNonNumeric(e) {
        if (!/[\d\s\b]/.test(e.key) && !e.ctrlKey) {
            e.preventDefault();
        }
    }

    function toggleNewAddressForm() {
        const usesSavedAddress = document.querySelector('input[name="saved_shipping_address"]:checked');
        if (newAddressForm) {
            newAddressForm.style.display = usesSavedAddress ? 'none' : 'block';
        }
    }

    function setupTooltips() {
        const tooltips = document.querySelectorAll('.tooltip-trigger');
        tooltips.forEach(tooltip => {
            tooltip.addEventListener('mouseenter', showTooltip);
            tooltip.addEventListener('mouseleave', hideTooltip);
        });
    }

    function showTooltip() {
        const tooltipText = this.getAttribute('data-tooltip');
        const tooltipElement = document.createElement('div');
        tooltipElement.className = 'tooltip';
        tooltipElement.textContent = tooltipText;
        document.body.appendChild(tooltipElement);
        const rect = this.getBoundingClientRect();
        tooltipElement.style.top = (rect.top - tooltipElement.offsetHeight - 10) + 'px';
        tooltipElement.style.left = (rect.left + (rect.width / 2) - (tooltipElement.offsetWidth / 2)) + 'px';
    }

    function hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) tooltip.remove();
    }

    function setupAlertDismissal() {
        const closeButtons = document.querySelectorAll('.close-alert');
        closeButtons.forEach(button => {
            button.addEventListener('click', function () {
                this.closest('.alert').remove();
            });
        });
    }

    function validateForm() {
        const errors = [];
        const selectedPaymentMethod = document.querySelector('input[name="payment_method"]:checked').value;

        // Validation des champs d'adresse
        const requiredFields = ['street_address', 'city', 'postal_code', 'country'];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
            if (field && !field.value.trim()) {
                const label = field.previousElementSibling ? field.previousElementSibling.textContent.replace(' *', '') : fieldId;
                errors.push(`Le champ ${label} est requis`);
            }
        });

        if (selectedPaymentMethod === 'card') {
            // Validation des champs de carte bancaire
            if (cardNumberInput) {
                const cardNumber = cardNumberInput.value.replace(/\s/g, '');
                if (!isValidCardNumber(cardNumber)) {
                    errors.push('Numéro de carte invalide');
                }
            }

            if (expiryMonth && expiryYear) {
                const month = expiryMonth.value;
                const year = expiryYear.value;
                if (!isValidExpiry(month, year)) {
                    errors.push("Date d'expiration invalide");
                }
            }

            if (cvvInput) {
                const cvv = cvvInput.value;
                if (!isValidCVV(cvv)) {
                    errors.push('Code de sécurité invalide');
                }
            }
        } else if (selectedPaymentMethod === 'delivery') {
            // Validation des champs pour la livraison
            const phone = document.getElementById('delivery_phone');
            const email = document.getElementById('delivery_email');

            if (phone && !isValidPhone(phone.value)) {
                errors.push('Numéro de téléphone invalide');
            }

            if (email && !isValidEmail(email.value)) {
                errors.push('Adresse email invalide');
            }
        }

        return errors;
    }

    function isValidCardNumber(number) {
        return cardPatterns.visa.test(number) || cardPatterns.mastercard.test(number) || cardPatterns.amex.test(number);
    }

    function isValidExpiry(month, year) {
        const currentDate = new Date();
        const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
        return expDate > currentDate;
    }

    function isValidCVV(cvv) {
        return /^\d{3}$/.test(cvv);
    }

    function isValidPhone(phone) {
        return /^[\d\s+()-]{8,}$/.test(phone);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showErrors(errors) {
        let errorContainer = document.querySelector('.error-messages');
        if (errorContainer) {
            errorContainer.remove();
        }
        if (errors.length > 0) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'error-messages';
            errors.forEach(error => {
                const errorElem = document.createElement('div');
                errorElem.className = 'error-message';
                errorElem.textContent = error;
                errorContainer.appendChild(errorElem);
            });
            payButton.parentNode.insertBefore(errorContainer, payButton);
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Fonction corrigée pour gérer la soumission du formulaire
    function handleSubmit(e) {
        e.preventDefault(); // Empêcher la soumission par défaut

        // Valider le formulaire
        const errors = validateForm();
        if (errors.length > 0) {
            showErrors(errors);
            return;
        }

        // Préparer les données du panier
        prepareCartData();

        // Obtenir le mode de paiement sélectionné
        const selectedPaymentMethod = document.querySelector('input[name="payment_method"]:checked').value;

        // Désactiver le bouton et afficher le spinner
        payButton.disabled = true;
        const originalText = payButton.innerHTML;
        payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement en cours...';

        // Soumettre le formulaire directement - solution la plus simple pour CSRF
        paymentForm.submit();
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(price);
    }

    // Fonction améliorée pour préparer les données du panier
    function prepareCartData() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartItemsContainer = document.getElementById('cart-items-container');

        console.log('Préparation des données du panier:', cart);
        console.log('Nombre d\'articles dans le panier:', cart.length);

        if (cartItemsContainer) {
            // Vider d'abord le conteneur
            cartItemsContainer.innerHTML = '';

            // Si le panier est vide, indiquer ce fait
            if (cart.length === 0) {
                console.log('Le panier est vide!');
                return;
            }

            // Ajouter un SKU par défaut à tous les articles qui n'en ont pas
            const cartWithDefaultSku = cart.map((item, index) => {
                // Cloner l'article pour ne pas modifier l'original
                const itemWithSku = {...item};
                
                // S'assurer que le champ sku existe et n'est pas vide
                if (!itemWithSku.sku) {
                    itemWithSku.sku = `SKU-${index}-${Date.now()}`;
                }
                
                return itemWithSku;
            });

            // IMPORTANT: Ajouter d'abord une représentation JSON complète du panier avec SKU
            const fullCartInput = document.createElement('input');
            fullCartInput.type = 'hidden';
            fullCartInput.name = 'full_cart_json';
            fullCartInput.value = JSON.stringify(cartWithDefaultSku);
            cartItemsContainer.appendChild(fullCartInput);
            console.log('Panier complet ajouté au formulaire avec SKU par défaut');

            // Ajouter chaque élément du panier comme input séparé
            cartWithDefaultSku.forEach((item, index) => {
                console.log(`Ajout de l'article ${index}:`, item);

                // Assurez-vous que toutes les valeurs sont dans des formats valides
                const cleanItem = {
                    id: item.id ? String(item.id) : '',
                    name: item.name || 'Produit sans nom',
                    price: parseFloat(item.price) || 0,
                    quantity: parseInt(item.quantity) || 1,
                    options: item.options || null,
                    sku: item.sku, // SKU déjà défini ci-dessus
                    image: item.image || null
                };

                // S'assurer que la valeur JSON est correctement formatée
                const jsonValue = JSON.stringify(cleanItem);
                
                // Ajouter l'article avec index numérique
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = `cart_items[${index}]`;
                input.value = jsonValue;
                cartItemsContainer.appendChild(input);

                // Ajouter aussi l'article avec l'ancienne notation pour compatibilité
                const inputLegacy = document.createElement('input');
                inputLegacy.type = 'hidden';
                inputLegacy.name = 'cart_items[]';
                inputLegacy.value = jsonValue;
                cartItemsContainer.appendChild(inputLegacy);

                console.log(`Article ${index} ajouté avec SKU: ${cleanItem.sku}`);
            });

            // Ajouter un champ caché pour indiquer le nombre d'articles
            const countInput = document.createElement('input');
            countInput.type = 'hidden';
            countInput.name = 'cart_item_count';
            countInput.value = cart.length;
            cartItemsContainer.appendChild(countInput);
            
            console.log(`Préparation terminée: ${cart.length} articles prêts à être envoyés`);
        } else {
            console.error('Conteneur cart-items-container non trouvé!');
        }
    }

    function autoSaveForm() {
        if (paymentForm) {
            const formData = new FormData(paymentForm);
            const data = Object.fromEntries(formData.entries());
            sessionStorage.setItem('payment_form_data', JSON.stringify(data));
        }
    }

    function restoreFormData() {
        const savedData = sessionStorage.getItem('payment_form_data');
        if (savedData && paymentForm) {
            try {
                const data = JSON.parse(savedData);
                Object.entries(data).forEach(([key, value]) => {
                    const input = paymentForm.querySelector(`[name="${key}"]`);
                    if (input) {
                        if (input.type === 'radio') {
                            const radio = paymentForm.querySelector(`[name="${key}"][value="${value}"]`);
                            if (radio) {
                                radio.checked = true;
                            }
                        } else {
                            input.value = value;
                        }
                    }
                });
                // Mettre à jour l'affichage après la restauration
                updatePaymentForm();
            } catch (error) {
                console.error('Erreur lors de la restauration des données du formulaire:', error);
            }
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    function loadPaymentStep(step) {
        const steps = document.querySelectorAll('.payment-steps .step');
        steps.forEach(s => s.classList.remove('active', 'completed'));
        for (let i = 0; i < steps.length; i++) {
            if (i < step) {
                steps[i].classList.add('completed');
            } else if (i === step) {
                steps[i].classList.add('active');
            }
        }
    }

    // Initialiser
    init();
    
    // Récupérer le contenu du panier
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Afficher le contenu du panier dans la console
    console.log("Contenu du panier dans localStorage:", cart);
    console.log("Nombre d'articles dans le panier:", cart.length);
    
    // Vérifier que le formulaire de paiement existe
    if (paymentForm) {
        console.log("Formulaire de paiement trouvé");
        
        // Ajouter un écouteur d'événement sur le formulaire
        paymentForm.addEventListener('submit', function(e) {
            // Ne pas bloquer la soumission du formulaire
            
            // Vérifier que les données du panier sont correctement préparées
            const cartInputs = document.querySelectorAll('input[name^="cart_items"]');
            console.log("Nombre d'inputs de panier:", cartInputs.length);
            
            // Afficher le contenu des inputs
            cartInputs.forEach((input, index) => {
                console.log(`Input ${index}:`, input.name, input.value);
                try {
                    const parsed = JSON.parse(input.value);
                    console.log(`Parsed ${index}:`, parsed);
                } catch (error) {
                    console.error(`Erreur de parsing pour l'input ${index}:`, error);
                }
            });
            
            console.log("Soumission du formulaire en cours...");
        });
    } else {
        console.error("Formulaire de paiement non trouvé!");
    }
});