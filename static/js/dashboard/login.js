document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorContainer = document.getElementById('error-container');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const emailInput = document.getElementById('email');

    // Gestion de l'affichage/masquage du mot de passe
    togglePasswordBtn.addEventListener('click', function() {
        const icon = this.querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });

    // Gestion de la soumission du formulaire
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = this.email.value;
        const password = this.password.value;
        const rememberMe = this.remember.checked;

        // Validation basique
        if (!validateEmail(email)) {
            showError('Veuillez entrer une adresse email valide');
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        // Animation du bouton
        const submitBtn = this.querySelector('.login-button');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Simuler une requête d'authentification
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Pour la démonstration, on vérifie des identifiants codés en dur
            // Dans un vrai projet, cela serait géré par une API
            if (email === 'admin@example.com' && password === 'admin123') {
                // Stocker les informations de connexion si "Se souvenir de moi" est coché
                if (rememberMe) {
                    localStorage.setItem('adminEmail', email);
                    // Stocker un token d'authentification (simulé ici)
                    localStorage.setItem('adminToken', generateToken());
                } else {
                    // Utiliser sessionStorage si "Se souvenir de moi" n'est pas coché
                    sessionStorage.setItem('adminToken', generateToken());
                    localStorage.removeItem('adminEmail');
                }

                showSuccess('Connexion réussie ! Redirection...');

                // Redirection vers le tableau de bord après un court délai
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showError('Email ou mot de passe incorrect');
            }
        } catch (error) {
            showError('Une erreur est survenue. Veuillez réessayer.');
            console.error('Error:', error);
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // Validation de l'email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Génération d'un token simple (pour la démonstration)
    function generateToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Affichage des erreurs
    function showError(message) {
        errorContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;

        // Animation de l'erreur
        const error = errorContainer.querySelector('.error-message');
        error.style.animation = 'none';
        error.offsetHeight; // Force reflow
        error.style.animation = 'slideIn 0.3s ease';
    }

    // Affichage des messages de succès
    function showSuccess(message) {
        errorContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                ${message}
            </div>
        `;

        const success = errorContainer.querySelector('.success-message');
        success.style.animation = 'slideIn 0.3s ease';
    }

    // Pré-remplir l'email si stocké
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        document.querySelector('input[name="remember"]').checked = true;
    }

    // Nettoyer les erreurs lors de la saisie
    const inputs = [emailInput, passwordInput];
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            errorContainer.innerHTML = '';
        });
    });

    // Vérification de la connexion existante
    function checkExistingSession() {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (token) {
            // Rediriger vers le dashboard si déjà connecté
            window.location.href = 'dashboard.html';
        }
    }

    // Vérifier la session au chargement
    checkExistingSession();

    // Gestion du "mot de passe oublié"
    const forgotPasswordLink = document.querySelector('.forgot-password');
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        const email = emailInput.value;
        
        if (!email) {
            showError('Veuillez entrer votre email pour réinitialiser le mot de passe');
            emailInput.focus();
            return;
        }

        if (!validateEmail(email)) {
            showError('Veuillez entrer une adresse email valide');
            emailInput.focus();
            return;
        }

        // Simuler l'envoi d'un email de réinitialisation
        showSuccess('Si cette adresse email existe, vous recevrez les instructions de réinitialisation.');
    });

    // Animation du formulaire au chargement
    document.querySelector('.login-card').style.opacity = '0';
    setTimeout(() => {
        document.querySelector('.login-card').style.opacity = '1';
        document.querySelector('.login-card').style.transform = 'translateY(0)';
    }, 100);
});