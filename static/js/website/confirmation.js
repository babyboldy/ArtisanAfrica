// confirmation.js - Gestion de la page de confirmation

document.addEventListener('DOMContentLoaded', function() {
    // Vérification initiale pour voir si des articles sont présents
    const orderItems = document.querySelectorAll('.order-item');
    console.log(`Nombre d'articles détectés dans le DOM: ${orderItems.length}`);
    
    // Vider le panier si le cookie clear_cart est présent
    if (document.cookie.indexOf('clear_cart=true') > -1) {
        clearCart();
    }
    
    // Créer les effets de confetti pour célébrer l'achat
    createConfetti();
    
    // Animation du suivi de progression
    animateProgress();
    
    // Initialisation
    function init() {
        // Gestionnaire pour le bouton de téléchargement de facture
        setupInvoiceButton();
    }
    
    // Nettoyer le panier et supprimer le cookie
    function clearCart() {
        console.log('Vidage du panier...');
        localStorage.removeItem('cart');
        
        // Mettre à jour le compteur du panier
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = '0';
        }
        
        // Supprimer le cookie après l'avoir utilisé
        document.cookie = 'clear_cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        console.log('Panier vidé.');
    }

    // Animation de confetti lors du chargement de la page
    function createConfetti() {
        const colors = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#673AB7'];
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);
        
        const numberOfConfetti = window.innerWidth < 768 ? 50 : 100; // Moins sur mobile
        
        for (let i = 0; i < numberOfConfetti; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Propriétés aléatoires pour chaque confetti
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.width = Math.random() * 8 + 5 + 'px'; // Taille variable
            confetti.style.height = Math.random() * 8 + 5 + 'px';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confetti.style.opacity = Math.random() * 0.7 + 0.3;
            
            // Position initiale aléatoire pour un effet plus naturel
            confetti.style.top = -Math.random() * 20 + 'px';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            container.appendChild(confetti);

            // Supprimer le confetti après l'animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 5000);
        }
        
        // Supprimer le conteneur après la fin des animations
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 6000);
    }
    
    // Animation de la barre de progression du suivi de commande
    function animateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            // Animation progressive de la barre
            setTimeout(() => {
                progressFill.style.width = '50%';
            }, 500);
        }
    }
    
    // Configuration du bouton de téléchargement de facture
    function setupInvoiceButton() {
        const downloadButton = document.getElementById('download-invoice-btn');
        
        if (downloadButton) {
            downloadButton.addEventListener('click', function(e) {
                // Animation de chargement
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération en cours...';
                this.disabled = true;
                
                // Ne pas bloquer l'action par défaut, mais ajouter une animation
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                    
                    // Afficher le message de succès
                    showInvoiceMessage(this);
                }, 1500);
            });
        }
    }
    
    // Afficher le message de téléchargement de facture
    function showInvoiceMessage(button) {
        // Supprimer un message existant s'il y en a un
        const existingMessage = document.querySelector('.invoice-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Créer un nouveau message
        const message = document.createElement('div');
        message.className = 'invoice-message';
        message.innerHTML = '<i class="fas fa-check-circle"></i> Facture téléchargée avec succès';
        
        // Ajouter le message au conteneur parent du bouton
        const parent = button.parentNode;
        parent.style.position = 'relative';
        parent.appendChild(message);
        
        // Supprimer le message après quelques secondes
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }
    
    // Fonction pour basculer l'affichage du bloc de débogage
    function toggleDebug() {
        const debugInfo = document.querySelector('.debug-info');
        if (debugInfo.style.display === 'none') {
            debugInfo.style.display = 'block';
            document.querySelector('.debug-info button').textContent = 'Masquer les infos de débogage';
        } else {
            debugInfo.style.display = 'none';
            document.querySelector('.debug-info button').textContent = 'Afficher les infos de débogage';
        }
    }
    
    // Rendre la fonction toggleDebug disponible globalement
    window.toggleDebug = toggleDebug;
    
    // Afficher dans la console des informations sur les articles
    console.log('Nombre d\'articles dans la commande:', orderItems.length);
    
    // Vérifier que les articles s'affichent bien dans le DOM
    console.log('Éléments .order-item trouvés dans le DOM:', orderItems.length);
    
    // Démarrer l'initialisation
    init();
});