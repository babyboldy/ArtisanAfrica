// contact.js - Gestion de la page de contact

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du formulaire
    const contactForm = document.querySelector('.contact-form');
    const submitBtn = document.querySelector('.submit-btn');
    
    // Éléments FAQ
    const faqItems = document.querySelectorAll('.faq-item');
    
    // Bouton chat
    const startChatBtn = document.querySelector('.start-chat');
    
    // Fonction d'initialisation
    function init() {
        initMap();
        setupFormValidation();
        setupFAQ();
        setupChat();
    }
    
    // Initialisation de la carte
    function initMap() {
        // La carte est initialisée via un script inline dans contact.html
        // Cette fonction est laissée vide pour une éventuelle implémentation future
    }
    
    // Configuration de la validation du formulaire
    function setupFormValidation() {
        if (!contactForm) return;
        
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validation du formulaire
            const { isValid, errors } = validateForm();

            if (!isValid) {
                showErrors(errors);
                return;
            }

            // Animation du bouton
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            try {
                // Simuler l'envoi du formulaire
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Réinitialiser le formulaire
                contactForm.reset();

                // Afficher le message de succès
                window.showNotification('Message envoyé avec succès !', 'success');

            } catch (error) {
                window.showNotification('Une erreur est survenue. Veuillez réessayer.', 'error');
            } finally {
                // Réinitialiser le bouton
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });

        // Nettoyer les erreurs lors de la saisie
        const formInputs = contactForm.querySelectorAll('input, textarea, select');
        formInputs.forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('error');
                removeMessages();
            });
        });
    }
    
    // Validation du formulaire
    function validateForm() {
        let isValid = true;
        const errors = [];

        // Validation des champs requis
        const requiredFields = contactForm.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                errors.push(`Le champ ${field.previousElementSibling.textContent} est requis`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });

        // Validation de l'email
        const emailField = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailField && emailField.value && !emailRegex.test(emailField.value)) {
            isValid = false;
            errors.push('Format d\'email invalide');
            emailField.classList.add('error');
        }

        // Validation du téléphone (optionnel)
        const phoneField = document.getElementById('phone');
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        if (phoneField && phoneField.value && !phoneRegex.test(phoneField.value)) {
            isValid = false;
            errors.push('Format de téléphone invalide');
            phoneField.classList.add('error');
        }

        return { isValid, errors };
    }

    // Gestion des messages d'erreur
    function showErrors(errors) {
        removeMessages();
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-messages';

        errors.forEach(error => {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error}`;
            errorContainer.appendChild(errorElement);
        });

        contactForm.insertBefore(errorContainer, submitBtn);
    }

    // Supprimer tous les messages
    function removeMessages() {
        const messages = contactForm.querySelectorAll('.error-messages, .success-message');
        messages.forEach(message => message.remove());
    }
    
    // Configuration de la FAQ
    function setupFAQ() {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');

            question.addEventListener('click', () => {
                // Gérer l'état actif
                const isCurrentlyActive = item.classList.contains('active');

                // Fermer tous les autres éléments FAQ
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        otherAnswer.style.maxHeight = '0';
                        otherAnswer.style.padding = '0 1.5rem';
                    }
                });

                // Basculer l'état de l'élément actuel
                if (!isCurrentlyActive) {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                } else {
                    item.classList.remove('active');
                    answer.style.maxHeight = '0';
                }
            });
        });
    }
    
    // Configuration du chat
    function setupChat() {
        if (!startChatBtn) return;
        
        startChatBtn.addEventListener('click', function() {
            // Vérifier si une fenêtre de chat existe déjà
            let existingChat = document.querySelector('.chat-window');
            if (existingChat) {
                return;
            }

            // Créer la fenêtre de chat
            const chatWindow = document.createElement('div');
            chatWindow.className = 'chat-window';
            chatWindow.innerHTML = `
                <div class="chat-header">
                    <h3>Chat en direct</h3>
                    <button class="close-chat">×</button>
                </div>
                <div class="chat-body">
                    <div class="chat-message bot">
                        Un conseiller va vous répondre dans quelques instants...
                    </div>
                </div>
                <div class="chat-input">
                    <input type="text" placeholder="Tapez votre message..." id="chatMessage">
                    <button><i class="fas fa-paper-plane"></i></button>
                </div>
            `;

            document.body.appendChild(chatWindow);

            // Animation d'entrée
            setTimeout(() => chatWindow.classList.add('active'), 100);

            // Gérer la fermeture
            chatWindow.querySelector('.close-chat').addEventListener('click', () => {
                chatWindow.classList.remove('active');
                setTimeout(() => chatWindow.remove(), 300);
            });
            
            // Gérer l'envoi de messages
            const chatInput = chatWindow.querySelector('.chat-input');
            const chatMessageInput = chatWindow.querySelector('#chatMessage');
            const chatBody = chatWindow.querySelector('.chat-body');
            
            chatInput.addEventListener('submit', function(e) {
                e.preventDefault();
                sendChatMessage();
            });
            
            chatInput.querySelector('button').addEventListener('click', sendChatMessage);
            
            chatMessageInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendChatMessage();
                }
            });
            
            function sendChatMessage() {
                const message = chatMessageInput.value.trim();
                if (!message) return;
                
                // Ajouter le message de l'utilisateur
                chatBody.innerHTML += `
                    <div class="chat-message user">
                        ${message}
                    </div>
                `;
                
                // Vider l'input
                chatMessageInput.value = '';
                
                // Faire défiler vers le bas
                chatBody.scrollTop = chatBody.scrollHeight;
                
                // Simuler une réponse automatique après 1 seconde
                setTimeout(() => {
                    chatBody.innerHTML += `
                        <div class="chat-message bot">
                            Merci pour votre message. Un conseiller vous répondra bientôt.
                        </div>
                    `;
                    chatBody.scrollTop = chatBody.scrollHeight;
                }, 1000);
            }
        });
    }
    
    // Démarrer l'initialisation
    init();
});