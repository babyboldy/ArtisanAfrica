document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    // Avatar
    const avatarPreview = document.querySelector('.avatar-preview');
    const avatarUpload = document.getElementById('avatarUpload');
    const removeAvatarBtn = document.querySelector('.remove-avatar');
    const removeAvatarInput = document.getElementById('removeAvatar');
    
    // Changement de mot de passe
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModal = document.getElementById('passwordModal');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    const passwordInputs = document.querySelectorAll('.password-input input');
    
    // Adresses
    const addAddressBtn = document.getElementById('addAddressBtn');
    const addressModal = document.getElementById('addressModal');
    const editAddressBtns = document.querySelectorAll('.edit-address');
    const deleteAddressBtns = document.querySelectorAll('.delete-address');
    
    // Modals et alertes
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const closeAlertBtns = document.querySelectorAll('.close-alert');
    
    // Navigation des sections
    const menuItems = document.querySelectorAll('.menu-item');
    const profileSections = document.querySelectorAll('.profile-section');

    // Initialisation des écouteurs d'événements
    initEventListeners();

    function initEventListeners() {
        // Avatar
        if (avatarPreview) {
            avatarPreview.addEventListener('click', () => avatarUpload.click());
        }
        
        if (avatarUpload) {
            avatarUpload.addEventListener('change', handleAvatarUpload);
        }
        
        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener('click', () => {
                if (confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
                    removeAvatarInput.value = 'true';
                    // Afficher une image par défaut
                    const imgElement = avatarPreview.querySelector('img');
                    imgElement.src = '/static/images/default-avatar.png';
                }
            });
        }

        // Gestion du mot de passe
        if (passwordInputs.length > 0) {
            passwordInputs.forEach(input => {
                input.addEventListener('input', validatePassword);
            });
        }

        // Montrer/cacher mot de passe
        if (togglePasswordBtns.length > 0) {
            togglePasswordBtns.forEach(btn => {
                btn.addEventListener('click', togglePasswordVisibility);
            });
        }
        
        // Ouvrir/Fermer le modal de mot de passe
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => {
                openModal('passwordModal');
            });
        }
        
        // Ouvrir/Fermer le modal d'adresse
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', () => {
                document.getElementById('addressModalTitle').textContent = 'Ajouter une adresse';
                document.getElementById('addressId').value = '';
                document.getElementById('addressForm').reset();
                openModal('addressModal');
            });
        }
        
        // Éditer une adresse
        if (editAddressBtns.length > 0) {
            editAddressBtns.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const addressId = this.dataset.id;
                    document.getElementById('addressModalTitle').textContent = 'Modifier l\'adresse';
                    document.getElementById('addressId').value = addressId;
                    
                    // Récupérer les données de l'adresse (simulation)
                    // Dans une application réelle, vous feriez un appel AJAX pour récupérer les données
                    const addressData = {
                        address_type: 'SHIPPING',
                        street_address: '123 Rue Exemple',
                        apartment: 'Apt 42',
                        city: 'Paris',
                        postal_code: '75000',
                        country: 'France',
                        is_default: true
                    };
                    
                    // Remplir le formulaire
                    document.getElementById('address_type').value = addressData.address_type;
                    document.getElementById('street_address').value = addressData.street_address;
                    document.getElementById('apartment').value = addressData.apartment;
                    document.getElementById('city').value = addressData.city;
                    document.getElementById('postal_code').value = addressData.postal_code;
                    document.getElementById('country').value = addressData.country;
                    document.getElementById('is_default').checked = addressData.is_default;
                    
                    openModal('addressModal');
                });
            });
        }
        
        // Supprimer une adresse
        if (deleteAddressBtns.length > 0) {
            deleteAddressBtns.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const addressId = this.dataset.id;
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) {
                        // Simuler la suppression
                        alert('Adresse supprimée avec succès');
                        // Dans une application réelle, vous feriez un appel AJAX ou un submit de formulaire
                    }
                });
            });
        }

        // Fermer les modals
        if (closeModalBtns.length > 0) {
            closeModalBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const modal = this.closest('.modal');
                    closeModal(modal.id);
                });
            });
        }
        
        // Navigation entre les sections
        if (menuItems.length > 0) {
            menuItems.forEach(item => {
                item.addEventListener('click', function() {
                    const section = this.dataset.section;
                    
                    // Mettre à jour les classes actives
                    menuItems.forEach(mi => mi.classList.remove('active'));
                    profileSections.forEach(ps => ps.classList.remove('active'));
                    
                    this.classList.add('active');
                    document.getElementById(section).classList.add('active');
                    
                    // Mettre à jour l'URL sans rechargement
                    history.pushState(null, null, `?section=${section}`);
                });
            });
        }

        // Fermer les alertes
        if (closeAlertBtns.length > 0) {
            closeAlertBtns.forEach(btn => {
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

    // Gestion de l'avatar
    function handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner une image valide');
            return;
        }

        // Réinitialiser le flag de suppression
        removeAvatarInput.value = 'false';

        // Prévisualiser l'image
        const reader = new FileReader();
        reader.onload = function(event) {
            avatarPreview.querySelector('img').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Gestion du mot de passe
    function validatePassword() {
        const newPasswordInput = document.getElementById('new_password');
        if (!newPasswordInput) return;

        const password = newPasswordInput.value;
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        Object.entries(requirements).forEach(([req, valid]) => {
            const element = document.querySelector(`[data-requirement="${req}"]`);
            if (element) {
                element.classList.toggle('valid', valid);
            }
        });
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

    // Gestion des modals
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Empêcher le défilement en arrière-plan
        }
    }
    
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Rétablir le défilement
        }
    }

    // Fermer les modals en cliquant en dehors
    window.addEventListener('click', function(e) {
        document.querySelectorAll('.modal.active').forEach(modal => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Navigation par paramètre URL
    function handleNavigation() {
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        
        if (section) {
            menuItems.forEach(item => {
                const isActive = item.dataset.section === section;
                item.classList.toggle('active', isActive);
            });
            
            profileSections.forEach(sec => {
                const isActive = sec.id === section;
                sec.classList.toggle('active', isActive);
            });
        }
    }

    // Vérifier l'URL au chargement et lors des changements
    handleNavigation();
    window.addEventListener('popstate', handleNavigation);

});