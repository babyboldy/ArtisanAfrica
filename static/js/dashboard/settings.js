document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');
    const saveBtn = document.getElementById('saveSettings');
    const resetBtn = document.getElementById('resetSettings');
    const imageUploads = document.querySelectorAll('.image-upload-group input[type="file"]');
    const imageRemoveBtns = document.querySelectorAll('.image-actions .btn-outline-danger');

    // État initial
    let initialSettings = {};
    let hasChanges = false;

    // Initialisation
    initSettings();
    initEventListeners();

    // Fonctions d'initialisation
    function initSettings() {
        // Sauvegarder les paramètres initiaux
        saveInitialSettings();
        // Vérifier l'URL pour la section active
        checkUrlParams();
        // Activer la détection des changements
        initChangeDetection();
    }

    function saveInitialSettings() {
        // Collecter tous les champs de formulaire
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                initialSettings[input.id] = input.checked;
            } else if (input.type === 'file') {
                // Ignorer les fichiers
                return;
            } else {
                initialSettings[input.id] = input.value;
            }
        });
    }

    function initEventListeners() {
        // Navigation
        navItems.forEach(item => {
            item.addEventListener('click', () => switchSection(item.dataset.section));
        });

        // Écouter les changements
        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('change', () => {
                hasChanges = true;
                updateSaveButton();
            });
        });

        // Gestion des images
        imageUploads.forEach(upload => {
            upload.addEventListener('change', handleImageUpload);
        });

        imageRemoveBtns.forEach(btn => {
            btn.addEventListener('click', handleImageRemove);
        });

        // Boutons d'action
        saveBtn.addEventListener('click', saveSettings);
        resetBtn.addEventListener('click', resetSettings);
    }

    function initChangeDetection() {
        // Détecter les changements non sauvegardés
        window.addEventListener('beforeunload', (e) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    // Gestion des sections
    function switchSection(sectionId) {
        if (hasChanges) {
            if (!confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment changer de section ?')) {
                return;
            }
        }

        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        sections.forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });

        // Mettre à jour l'URL
        history.pushState({}, '', `?section=${sectionId}`);
    }

    function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        if (section) {
            switchSection(section);
        }
    }

    // Gestion des images
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Veuillez sélectionner une image valide', 'error');
            return;
        }

        const preview = e.target.closest('.image-upload-group').querySelector('img');
        const reader = new FileReader();

        reader.onload = function(event) {
            preview.src = event.target.result;
            hasChanges = true;
            updateSaveButton();
        };

        reader.readAsDataURL(file);
    }

    function handleImageRemove(e) {
        const group = e.target.closest('.image-upload-group');
        const preview = group.querySelector('img');
        const input = group.querySelector('input[type="file"]');

        preview.src = '/api/placeholder/200/60';
        input.value = '';
        hasChanges = true;
        updateSaveButton();
    }

    // Gestion des paramètres
    async function saveSettings() {
        if (!validateSettings()) {
            return;
        }

        const saveBtn = document.getElementById('saveSettings');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

        try {
            // Collecter tous les paramètres
            const settings = collectSettings();
            
            // Simuler une sauvegarde
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mettre à jour les paramètres initiaux
            saveInitialSettings();
            hasChanges = false;
            updateSaveButton();

            showToast('Paramètres enregistrés avec succès', 'success');
        } catch (error) {
            showToast('Erreur lors de l\'enregistrement des paramètres', 'error');
            console.error('Error saving settings:', error);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
        }
    }

    function resetSettings() {
        if (!confirm('Voulez-vous vraiment réinitialiser tous les paramètres ?')) {
            return;
        }

        // Restaurer les valeurs initiales
        Object.entries(initialSettings).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Réinitialiser les images
        document.querySelectorAll('.image-preview img').forEach(img => {
            img.src = img.dataset.default || '/api/placeholder/200/60';
        });

        hasChanges = false;
        updateSaveButton();
        showToast('Paramètres réinitialisés', 'info');
    }

    function validateSettings() {
        let isValid = true;
        const requiredFields = document.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                showFieldError(field, 'Ce champ est requis');
            } else {
                field.classList.remove('error');
                removeFieldError(field);
            }
        });

        // Validation de l'email
        const emailField = document.getElementById('storeEmail');
        if (emailField && !validateEmail(emailField.value)) {
            isValid = false;
            emailField.classList.add('error');
            showFieldError(emailField, 'Email invalide');
        }

        return isValid;
    }

    function collectSettings() {
        const settings = {};
        const forms = document.querySelectorAll('.settings-form');

        forms.forEach(form => {
            const formData = new FormData(form);
            for (let [key, value] of formData.entries()) {
                settings[key] = value;
            }
        });

        return settings;
    }

    // Utilitaires
    function updateSaveButton() {
        saveBtn.disabled = !hasChanges;
        resetBtn.disabled = !hasChanges;
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showFieldError(field, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        const existingError = field.parentNode.querySelector('.field-error');
        if (!existingError) {
            field.parentNode.appendChild(errorDiv);
        }
    }

    function removeFieldError(field) {
        const error = field.parentNode.querySelector('.field-error');
        if (error) {
            error.remove();
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        const container = document.querySelector('.toast-container') || 
            (() => {
                const container = document.createElement('div');
                container.className = 'toast-container';
                document.body.appendChild(container);
                return container;
            })();

        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 3000);
    }
});