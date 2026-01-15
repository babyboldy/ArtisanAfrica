// contact.js - Script pour la page de contact

document.addEventListener('DOMContentLoaded', function() {
    // Gestion des FAQ (toggle)
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', function() {
            // Ferme tous les autres éléments
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle l'élément actuel
            item.classList.toggle('active');
        });
    });
    
    // Bouton chat en direct
    const startChatBtn = document.querySelector('.start-chat');
    const chatWindow = document.querySelector('.chat-window');
    const closeChatBtn = document.querySelector('.close-chat');
    const chatFloatBtn = document.querySelector('.chat-float-btn');
    
    // Ajout dynamique de la fenêtre de chat et du bouton flottant si non présents dans le HTML
    if (!chatWindow) {
        const chatWindowHTML = `
            <div class="chat-window">
                <div class="chat-header">
                    <h3>Chat en direct</h3>
                    <button class="close-chat"><i class="fas fa-times"></i></button>
                </div>
                <div class="chat-body">
                    <div class="chat-message bot">
                        Bonjour ! Comment puis-je vous aider aujourd'hui ?
                    </div>
                </div>
                <div class="chat-input">
                    <input type="text" placeholder="Tapez votre message...">
                    <button><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatWindowHTML);
    }
    
    if (!chatFloatBtn) {
        const chatFloatBtnHTML = `
            <button class="chat-float-btn">
                <i class="fas fa-comments"></i>
            </button>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatFloatBtnHTML);
    }
    
    // Récupération des éléments après leur éventuelle création
    const chatWindowEl = document.querySelector('.chat-window');
    const closeChatBtnEl = document.querySelector('.close-chat');
    const chatFloatBtnEl = document.querySelector('.chat-float-btn');
    const chatInput = document.querySelector('.chat-input input');
    const chatSendBtn = document.querySelector('.chat-input button');
    const chatBody = document.querySelector('.chat-body');
    
    // Ouvrir le chat depuis le bouton dans la carte d'info
    if (startChatBtn) {
        startChatBtn.addEventListener('click', function() {
            chatWindowEl.classList.add('active');
            chatFloatBtnEl.classList.add('active');
        });
    }
    
    // Ouvrir/fermer le chat depuis le bouton flottant
    chatFloatBtnEl.addEventListener('click', function() {
        chatWindowEl.classList.add('active');
        this.classList.add('active');
    });
    
    // Fermer le chat
    closeChatBtnEl.addEventListener('click', function() {
        chatWindowEl.classList.remove('active');
        chatFloatBtnEl.classList.remove('active');
    });
    
    // Envoi de message
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message !== '') {
            // Ajout du message utilisateur
            chatBody.innerHTML += `
                <div class="chat-message user">
                    ${message}
                </div>
            `;
            
            chatInput.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;
            
            // Simuler une réponse après un délai
            setTimeout(() => {
                chatBody.innerHTML += `
                    <div class="chat-message bot">
                        Merci pour votre message. Un conseiller va vous répondre dans quelques instants.
                    </div>
                `;
                chatBody.scrollTop = chatBody.scrollHeight;
            }, 1000);
        }
    }
    
    // Envoi par clic
    chatSendBtn.addEventListener('click', sendMessage);
    
    // Envoi par touche Entrée
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Validation du formulaire
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        const inputs = contactForm.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                // Validation simple
                if (this.hasAttribute('required') && this.value.trim() === '') {
                    this.classList.add('invalid');
                    this.classList.remove('valid');
                } else {
                    this.classList.remove('invalid');
                    this.classList.add('valid');
                }
            });
        });
        
        contactForm.addEventListener('submit', function(e) {
            let isValid = true;
            
            // Vérification de tous les champs requis
            inputs.forEach(input => {
                if (input.hasAttribute('required') && input.value.trim() === '') {
                    input.classList.add('invalid');
                    isValid = false;
                }
            });
            
            // Si le formulaire n'est pas valide, on empêche l'envoi
            if (!isValid) {
                e.preventDefault();
                // Afficher un message d'erreur
                const formError = document.createElement('div');
                formError.className = 'alert error-message';
                formError.textContent = 'Veuillez remplir tous les champs obligatoires.';
                
                // Ajouter le message au début du formulaire
                const firstChild = contactForm.firstChild;
                contactForm.insertBefore(formError, firstChild);
                
                // Supprimer le message après 3 secondes
                setTimeout(() => {
                    formError.remove();
                }, 3000);
            } else {
                // Animation du bouton d'envoi
                const submitBtn = contactForm.querySelector('.submit-btn');
                submitBtn.classList.add('loading');
                submitBtn.innerHTML = '';
                
                // Nous permettons l'envoi naturel du formulaire 
                // pour une soumission réelle au backend
            }
        });
    }
    
    // Effet de scroll doux pour les ancres
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});