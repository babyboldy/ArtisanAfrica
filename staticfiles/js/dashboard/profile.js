// profile.js - Gestion du profil utilisateur

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const elements = {
        // Avatar
        avatarPreview: document.querySelector('.avatar-preview'),
        avatarUpload: document.getElementById('avatarUpload'),
        removeAvatarBtn: document.querySelector('.remove-avatar'),
        removeAvatarInput: document.getElementById('removeAvatar'),
        
        // Changement de mot de passe
        changePasswordBtn: document.getElementById('changePasswordBtn'),
        passwordModal: document.getElementById('passwordModal'),
        togglePasswordBtns: document.querySelectorAll('.toggle-password'),
        passwordInputs: document.querySelectorAll('.password-input input'),
        passwordForm: document.getElementById('passwordForm'),
        
        // Adresses
        addAddressBtn: document.getElementById('addAddressBtn'),
        addressModal: document.getElementById('addressModal'),
        editAddressBtns: document.querySelectorAll('.edit-address'),
        deleteAddressBtns: document.querySelectorAll('.delete-address'),
        addressForm: document.getElementById('addressForm'),
        
        // Modals et alertes
        closeModalBtns: document.querySelectorAll('.close-modal'),
        closeAlertBtns: document.querySelectorAll('.close-alert'),
        
        // Navigation des sections
        menuItems: document.querySelectorAll('.menu-item'),
        profileSections: document.querySelectorAll('.profile-section')
    };

    // Initialisation
    initAvatarManager();
    initPasswordManager();
    initAddressManager();
    initModals();
    initSectionNavigation();
    initAlerts();

    // Vérifier l'URL pour la section active
    handleUrlNavigation();

    // Gestion de l'avatar
    function initAvatarManager() {
        if (elements.avatarPreview && elements.avatarUpload) {
            elements.avatarPreview.addEventListener('click', () => {
                elements.avatarUpload.click();
            });

            elements.avatarUpload.addEventListener('change', handleAvatarUpload);
        }
        
        if (elements.removeAvatarBtn && elements.removeAvatarInput) {
            elements.removeAvatarBtn.addEventListener('click', () => {
                if (confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
                    elements.removeAvatarInput.value = 'true';
                    
                    // Afficher une image par défaut
                    const imgElement = elements.avatarPreview.querySelector('img');
                    if (imgElement) {
                        imgElement.src = '/static/images/default-avatar.png';
                        showToast('Photo de profil supprimée', 'info');
                    }
                }
            });
        }
    }

    // Gestion du mot de passe
    function initPasswordManager() {
        if (elements.passwordInputs.length > 0) {
            elements.passwordInputs.forEach(input => {
                input.addEventListener('input', validatePassword);
            });
        }

        // Montrer/cacher mot de passe
        if (elements.togglePasswordBtns.length > 0) {
            elements.togglePasswordBtns.forEach(btn => {
                btn.addEventListener('click', togglePasswordVisibility);
            });
        }

        if (elements.changePasswordBtn && elements.passwordModal) {
            elements.changePasswordBtn.addEventListener('click', () => {
                openModal('passwordModal');
            });
        }

        // Validation avant soumission
        if (elements.passwordForm) {
            elements.passwordForm.addEventListener('submit', function(e) {
                const newPassword = document.getElementById('new_password');
                const confirmPassword = document.getElementById('confirm_password');
                
                if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
                    e.preventDefault();
                    showToast('Les mots de passe ne correspondent pas', 'error');
                    confirmPassword.focus();
                }
            });
        }
    }

    // Gestion des adresses
    function initAddressManager() {
        if (elements.addAddressBtn && elements.addressModal) {
            elements.addAddressBtn.addEventListener('click', () => {
                const modalTitle = document.getElementById('addressModalTitle');
                if (modalTitle) modalTitle.textContent = 'Ajouter une adresse';
                
                const addressIdInput = document.getElementById('addressId');
                if (addressIdInput) addressIdInput.value = '';
                
                if (elements.addressForm) elements.addressForm.reset();
                
                openModal('addressModal');
            });
        }
        
        // Éditer une adresse
        if (elements.editAddressBtns.length > 0) {
            elements.editAddressBtns.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const addressId = this.dataset.id;
                    
                    const modalTitle = document.getElementById('addressModalTitle');
                    if (modalTitle) modalTitle.textContent = 'Modifier l\'adresse';
                    
                    const addressIdInput = document.getElementById('addressId');
                    if (addressIdInput) addressIdInput.value = addressId;
                    
                    // Récupérer les données de l'adresse via AJAX
                    fetch(`/addresses/${addressId}/`, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            fillAddressForm(data.address);
                            openModal('addressModal');
                        } else {
                            showToast('Erreur lors de la récupération de l\'adresse', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur:', error);
                        showToast('Erreur de connexion au serveur', 'error');
                        
                        // Fallback avec des données simulées
                        const addressData = {
                            address_type: 'SHIPPING',
                            street_address: '123 Rue Exemple',
                            apartment: 'Apt 42',
                            city: 'Paris',
                            postal_code: '75000',
                            country: 'France',
                            is_default: true
                        };
                        
                        fillAddressForm(addressData);
                        openModal('addressModal');
                    });
                });
            });
        }
        
        // Supprimer une adresse
        if (elements.deleteAddressBtns.length > 0) {
            elements.deleteAddressBtns.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const addressId = this.dataset.id;
                    
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) {
                        // Envoyer la requête de suppression
                        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                        
                        fetch(`/addresses/delete/${addressId}/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': csrfToken || '',
                                'Content-Type': 'application/json'
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Supprimer la carte du DOM
                                this.closest('.address-card').remove();
                                showToast('Adresse supprimée avec succès', 'success');
                                
                                // Si aucune adresse, afficher un message
                                const addressesCount = document.querySelectorAll('.address-card').length;
                                if (addressesCount === 0) {
                                    const addressesList = document.querySelector('.addresses-list');
                                    if (addressesList) {
                                        addressesList.innerHTML = `
                                            <div class="empty-state">
                                                <i class="fas fa-map-marker-alt"></i>
                                                <h4>Aucune adresse enregistrée</h4>
                                                <p>Vous n'avez pas encore ajouté d'adresse à votre compte.</p>
                                            </div>
                                        `;
                                    }
                                }
                            } else {
                                showToast('Erreur lors de la suppression de l\'adresse', 'error');
                            }
                        })
                        .catch(error => {
                            console.error('Erreur:', error);
                            showToast('Erreur de connexion au serveur', 'error');
                        });
                    }
                });
            });
        }
    }

    // Gestion des modals
    function initModals() {
        if (elements.closeModalBtns.length > 0) {
            elements.closeModalBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const modal = this.closest('.modal');
                    if (modal) {
                        closeModal(modal.id);
                    }
                });
            });
        }
        
        // Fermer les modals en cliquant en dehors
        window.addEventListener('click', function(e) {
            document.querySelectorAll('.modal.active').forEach(modal => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });
        
        // Fermer les modals avec Echap
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    closeModal(modal.id);
                });
            }
        });
    }

    // Navigation entre les sections
    function initSectionNavigation() {
        if (elements.menuItems.length > 0) {
            elements.menuItems.forEach(item => {
                item.addEventListener('click', function() {
                    const section = this.dataset.section;
                    switchToSection(section);
                });
            });
        }
    }

    // Gestion des alertes
    function initAlerts() {
        if (elements.closeAlertBtns.length > 0) {
            elements.closeAlertBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    this.parentElement.remove();
                });
            });
        }

        // Auto-fermer les alertes après 5 secondes
        setTimeout(() => {
            document.querySelectorAll('.alert').forEach(alert => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            });
        }, 5000);
    }

    // Fonctions utilitaires
    function handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Veuillez sélectionner une image valide', 'error');
            return;
        }

        // Réinitialiser le flag de suppression
        if (elements.removeAvatarInput) elements.removeAvatarInput.value = 'false';

        // Prévisualiser l'image
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = elements.avatarPreview.querySelector('img');
            if (img) img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function validatePassword() {
        const newPasswordInput = document.getElementById('new_password');
        const confirmPasswordInput = document.getElementById('confirm_password');
        if (!newPasswordInput) return;

        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput?.value;
        
        // Vérifier les critères du mot de passe
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        // Mettre à jour les indicateurs visuels
        Object.entries(requirements).forEach(([req, valid]) => {
            const element = document.querySelector(`[data-requirement="${req}"]`);
            if (element) {
                element.classList.toggle('valid', valid);
            }
        });
        
        // Vérifier la correspondance avec la confirmation
        if (confirmPassword && password !== confirmPassword) {
            const confirmElement = document.querySelector('.password-mismatch');
            if (confirmElement) {
                confirmElement.style.display = 'block';
            } else {
                const mismatchElement = document.createElement('div');
                mismatchElement.className = 'password-mismatch';
                mismatchElement.style.color = 'var(--danger)';
                mismatchElement.style.fontSize = '0.85rem';
                mismatchElement.style.marginTop = '0.5rem';
                mismatchElement.textContent = 'Les mots de passe ne correspondent pas';
                confirmPasswordInput.parentNode.appendChild(mismatchElement);
            }
        } else {
            const confirmElement = document.querySelector('.password-mismatch');
            if (confirmElement) confirmElement.style.display = 'none';
        }
    }

    function togglePasswordVisibility(e) {
        const input = e.currentTarget.closest('.password-input').querySelector('input');
        const icon = e.currentTarget.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }

    function fillAddressForm(data) {
        if (!elements.addressForm) return;
        
        const fields = {
            address_type: document.getElementById('address_type'),
            street_address: document.getElementById('street_address'),
            apartment: document.getElementById('apartment'),
            city: document.getElementById('city'),
            postal_code: document.getElementById('postal_code'),
            country: document.getElementById('country'),
            is_default: document.getElementById('is_default')
        };
        
        if (fields.address_type) fields.address_type.value = data.address_type || '';
        if (fields.street_address) fields.street_address.value = data.street_address || '';
        if (fields.apartment) fields.apartment.value = data.apartment || '';
        if (fields.city) fields.city.value = data.city || '';
        if (fields.postal_code) fields.postal_code.value = data.postal_code || '';
        if (fields.country) fields.country.value = data.country || '';
        if (fields.is_default) fields.is_default.checked = !!data.is_default;
    }

    function switchToSection(section) {
        if (!section) return;
        
        // Mettre à jour les classes actives
        elements.menuItems.forEach(mi => mi.classList.toggle('active', mi.dataset.section === section));
        elements.profileSections.forEach(ps => ps.classList.toggle('active', ps.id === section));
        
        // Mettre à jour l'URL sans rechargement
        history.pushState(null, null, `?section=${section}`);
    }

    function handleUrlNavigation() {
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        
        if (section) {
            switchToSection(section);
        }
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});