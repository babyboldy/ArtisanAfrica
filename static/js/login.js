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

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = document.querySelector('input[name="remember"]').checked;

        // Validation simple côté client
        if (!validateEmail(email)) {
            showError('Veuillez entrer une adresse email valide');
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        // Désactiver le bouton et ajouter l'animation
        const submitBtn = this.querySelector('.login-button');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Envoyer les données à l'API Django pour vérification
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Authentification réussie
                const token = data.token;
                if (rememberMe) {
                    localStorage.setItem('adminToken', token);
                    localStorage.setItem('adminEmail', email);
                } else {
                    sessionStorage.setItem('adminToken', token);
                }

                showSuccess('Connexion réussie ! Redirection...');
                setTimeout(() => {
                    window.location.href = '/admin/dashboard/';
                }, 1000);
            } else {
                showError(data.message || 'Identifiants incorrects.');
            }
        } catch (error) {
            showError('Erreur de connexion au serveur. Réessayez.');
            console.error('Erreur :', error);
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

    // Affichage des erreurs
    function showError(message) {
        errorContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
    }

    // Affichage des messages de succès
    function showSuccess(message) {
        errorContainer.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i> ${message}
            </div>
        `;
    }

    // Pré-remplir l'email si stocké
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        document.querySelector('input[name="remember"]').checked = true;
    }

    // Nettoyer les erreurs lors de la saisie
    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('input', function() {
            errorContainer.innerHTML = '';
        });
    });

    // Vérification de la connexion existante
    function checkExistingSession() {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (token) {
            window.location.href = '/admin/dashboard/';
        }
    }
    checkExistingSession();

    // Gestion du "mot de passe oublié"
    document.querySelector('.forgot-password').addEventListener('click', function(e) {
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

        fetch('/api/reset-password/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('Email de réinitialisation envoyé.');
            } else {
                showError(data.message || 'Erreur lors de la demande.');
            }
        })
        .catch(() => {
            showError('Problème de connexion au serveur.');
        });
    });
});
