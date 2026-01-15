// settings.js - Gestion des paramètres du système

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const elements = {
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('.settings-section'),
        saveBtn: document.getElementById('saveSettings'),
        resetBtn: document.getElementById('resetSettings'),
        imageUploads: document.querySelectorAll('.image-upload-group input[type="file"]'),
        imageRemoveBtns: document.querySelectorAll('.image-actions .btn-outline-danger')
    };

    // État initial
    let initialSettings = {};
    let hasChanges = false;

    // Initialisation
    saveInitialSettings();
    initSectionNavigation();
    initImageHandlers();
    initFormHandlers();
    initButtons();
    checkUrlParams();
    initChangeDetection();

    // Fonctions d'initialisation
    function saveInitialSettings() {
        // Collecter tous les champs de formulaire
        const inputs = document.querySelectorAll('input:not([type="file"]), select, textarea');
        
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                initialSettings[input.id] = input.checked;
            } else {
                initialSettings[input.id] = input.value;
            }
        });
    }

    function initSectionNavigation() {
        if (!elements.navItems.length) return;

        elements.navItems.forEach(item => {
            item.addEventListener('click', () => switchSection(item.dataset.section));
        });
    }

    function initImageHandlers() {
        // Gestion des uploads d'images
        elements.imageUploads.forEach(upload => {
            upload.addEventListener('change', handleImageUpload);
        });

        // Gestion de la suppression d'images
        elements.imageRemoveBtns.forEach(btn => {
            btn.addEventListener('click', handleImageRemove);
        });
    }

    function initFormHandlers() {
        // Écouter les changements dans les formulaires
        document.querySelectorAll('input, select, textarea').forEach(input => {
            // Ignorer les éléments cachés et les boutons
            if (input.type === 'hidden' || input.type === 'button' || input.type === 'submit') {
                return;
            }

            // Ajouter des écouteurs d'événements adaptés au type d'input
            if (input.type === 'checkbox' || input.type === 'radio' || input.type === 'file' || input.tagName.toLowerCase() === 'select') {
                input.addEventListener('change', markAsChanged);
            } else {
                input.addEventListener('input', markAsChanged);
            }
        });

        // Validation en temps réel
        const emailFields = document.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            field.addEventListener('blur', function() {
                validateEmail(this);
            });
        });

        const requiredFields = document.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', function() {
                validateRequired(this);
            });
        });
    }

    function initButtons() {
        if (elements.saveBtn) {
            elements.saveBtn.addEventListener('click', saveSettings);
            elements.saveBtn.disabled = !hasChanges;
        }

        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', resetSettings);
            elements.resetBtn.disabled = !hasChanges;
        }
    }

    function initChangeDetection() {
        // Détecter les changements non sauvegardés avant de quitter la page
        window.addEventListener('beforeunload', (e) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?';
                return e.returnValue;
            }
        });
    }

    // Fonctions de gestion des sections
    function switchSection(sectionId) {
        if (!sectionId) return;

        // Vérifier s'il y a des changements non sauvegardés
        if (hasChanges) {
            if (!confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment changer de section ?')) {
                return;
            }
        }

        // Mettre à jour les classes actives
        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        elements.sections.forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });

        // Mettre à jour l'URL sans rechargement
        history.pushState(null, null, `?section=${sectionId}`);
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
        if (!preview) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            preview.src = event.target.result;
            markAsChanged();
        };

        reader.readAsDataURL(file);
    }

    function handleImageRemove(e) {
        e.preventDefault();
        
        const group = e.target.closest('.image-upload-group');
        const preview = group.querySelector('img');
        const input = group.querySelector('input[type="file"]');
        
        if (!preview || !input) return;

        // Réinitialiser l'image
        preview.src = preview.dataset.default || '/api/placeholder/200/60';
        input.value = '';
        
        markAsChanged();
    }

    // Validation des formulaires
    function validateEmail(field) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
        toggleFieldError(field, isValid, 'Adresse email invalide');
        return isValid;
    }

    function validateRequired(field) {
        const isValid = field.value.trim() !== '';
        toggleFieldError(field, isValid, 'Ce champ est requis');
        return isValid;
    }

    function toggleFieldError(field, isValid, errorMessage) {
        // Supprimer l'ancienne erreur
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Si invalide, ajouter une nouvelle erreur
        if (!isValid) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = errorMessage;
            errorDiv.style.color = 'var(--danger)';
            errorDiv.style.fontSize = '0.85rem';
            errorDiv.style.marginTop = '0.25rem';
            
            field.parentNode.appendChild(errorDiv);
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    }

    // Gestion des paramètres
    function saveSettings() {
        // Valider tous les champs du formulaire
        if (!validateAllFields()) {
            showToast('Veuillez corriger les erreurs dans le formulaire', 'error');
            return;
        }

        // Désactiver le bouton pendant la sauvegarde
        const saveBtn = elements.saveBtn;
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

        // Simuler une sauvegarde (à remplacer par un vrai appel AJAX)
        setTimeout(() => {
            // Collecter tous les paramètres
            const settings = collectSettings();
            
            // Enregistrer et mettre à jour les paramètres initiaux
            saveInitialSettings();
            hasChanges = false;
            updateButtons();

            // Restaurer le bouton
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;

            showToast('Paramètres enregistrés avec succès', 'success');
        }, 1500);
    }

    function resetSettings() {
        if (!confirm('Voulez-vous vraiment réinitialiser tous les paramètres ? Les modifications non enregistrées seront perdues.')) {
            return;
        }

        // Restaurer les valeurs initiales
        Object.entries(initialSettings).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (!element) return;

            if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = value;
            } else {
                element.value = value;
            }
        });

        // Réinitialiser les images
        document.querySelectorAll('.image-preview img').forEach(img => {
            img.src = img.dataset.default || '/api/placeholder/200/60';
        });

        // Nettoyer les erreurs
        document.querySelectorAll('.field-error').forEach(error => error.remove());
        document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));

        hasChanges = false;
        updateButtons();
        showToast('Paramètres réinitialisés', 'info');
    }

    function validateAllFields() {
        let isValid = true;
        
        // Valider les champs requis
        document.querySelectorAll('[required]').forEach(field => {
            if (!validateRequired(field)) {
                isValid = false;
            }
        });

        // Valider les emails
        document.querySelectorAll('input[type="email"]').forEach(field => {
            if (field.value.trim() !== '' && !validateEmail(field)) {
                isValid = false;
            }
        });

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
    function markAsChanged() {
        hasChanges = true;
        updateButtons();
    }

    function updateButtons() {
        if (elements.saveBtn) elements.saveBtn.disabled = !hasChanges;
        if (elements.resetBtn) elements.resetBtn.disabled = !hasChanges;
    }
});