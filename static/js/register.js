document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const errorContainer = document.getElementById('error-container');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const emailInput = document.getElementById('email');

    // Gestion de l'affichage/masquage du mot de passe
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Gestion de la soumission du formulaire
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fullname = document.getElementById('fullname').value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validation des champs
        if (!fullname) {
            showError('Veuillez entrer votre nom complet');
            return;
        }

        if (!validateEmail(email)) {
            showError('Veuillez entrer une adresse email valide');
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        if (password !== confirmPassword) {
            showError('Les mots de passe ne correspondent pas');
            return;
        }

        // Désactiver le bouton et ajouter l'animation
        const submitBtn = this.querySelector('.login-button');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Envoyer les données à l'API Django pour inscription
            const response = await fetch('/api/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess('Inscription réussie ! Redirection...');
                setTimeout(() => {
                    window.location.href = '/login/';
                }, 1000);
            } else {
                showError(data.message || 'Erreur lors de l’inscription.');
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
});
