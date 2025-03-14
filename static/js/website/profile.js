// profile.js - Gestion de la page profil client

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const profileNavItems = document.querySelectorAll('.profile-nav .nav-item');
    const profileSections = document.querySelectorAll('.profile-section');
    const profileImageUpload = document.getElementById('profileImageUpload');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const removePhotoBtn = document.getElementById('removePhoto');
    const removePhotoInput = document.getElementById('removePhotoInput');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    const passwordInputs = document.querySelectorAll('.password-input input');
    const newPasswordInput = document.getElementById('new_password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const addAddressBtn = document.getElementById('addAddressBtn');
    const editAddressBtns = document.querySelectorAll('.btn-edit-address');
    const deleteAddressBtns = document.querySelectorAll('.btn-delete-address');
    const addressModal = document.querySelector('#addressModal');
    const addressForm = document.getElementById('addressForm');
    const closeAlertBtns = document.querySelectorAll('.close-alert');

    // Initialisation des écouteurs d'événements
    initEventListeners();

    function initEventListeners() {
        // Navigation dans les sections de profil
        profileNavItems.forEach(item => {
            if (item.classList.contains('logout')) return; // Ignorer le lien de déconnexion
            
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const targetSection = this.getAttribute('data-section');
                
                // Mettre à jour les classes actives
                profileNavItems.forEach(navItem => {
                    if (navItem.classList.contains('logout')) return;
                    navItem.classList.remove('active');
                });
                this.classList.add('active');
                
                // Afficher la section correspondante
                profileSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetSection) {
                        section.classList.add('active');
                    }
                });
                
                // Mettre à jour l'URL
                history.pushState(null, null, `?section=${targetSection}`);
            });
        });

        // Gestion de l'upload d'image de profil
        if (profileImageUpload) {
            profileImageUpload.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        profileImagePreview.src = e.target.result;
                    };
                    reader.readAsDataURL(this.files[0]);
                    
                    // Réinitialiser le flag de suppression
                    removePhotoInput.value = 'false';
                }
            });
        }

        // Gestion de la suppression de photo de profil
        if (removePhotoBtn) {
            removePhotoBtn.addEventListener('click', function() {
                if (confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
                    profileImagePreview.src = '/static/images/default-avatar.png';
                    removePhotoInput.value = 'true';
                    
                    // Réinitialiser le champ de fichier
                    if (profileImageUpload) {
                        profileImageUpload.value = '';
                    }
                }
            });
        }

        // Gestion du mot de passe
        if (passwordInputs.length > 0) {
            // Afficher/masquer le mot de passe
            togglePasswordBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const input = this.closest('.password-input').querySelector('input');
                    const icon = this.querySelector('i');
                    
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.classList.replace('fa-eye', 'fa-eye-slash');
                    } else {
                        input.type = 'password';
                        icon.classList.replace('fa-eye-slash', 'fa-eye');
                    }
                });
            });
            
            // Validation du mot de passe
            if (newPasswordInput) {
                newPasswordInput.addEventListener('input', validatePassword);
                
                // Vérifier la correspondance des mots de passe
                if (confirmPasswordInput) {
                    confirmPasswordInput.addEventListener('input', function() {
                        if (newPasswordInput.value !== this.value) {
                            this.setCustomValidity('Les mots de passe ne correspondent pas');
                        } else {
                            this.setCustomValidity('');
                        }
                    });
                }
            }
        }

        // Gestion des adresses
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', function() {
                openAddressModal();
            });
        }
        
        // Édition d'adresse
        if (editAddressBtns.length > 0) {
            editAddressBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const addressId = this.getAttribute('data-id');
                    editAddress(addressId);
                });
            });
        }
        
        // Suppression d'adresse
        if (deleteAddressBtns.length > 0) {
            deleteAddressBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const addressId = this.getAttribute('data-id');
                    deleteAddress(addressId);
                });
            });
        }
        
        // Fermeture des alertes
        if (closeAlertBtns.length > 0) {
            closeAlertBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    this.parentElement.remove();
                });
            });
        }
        
        // Auto-fermeture des alertes après 5 secondes
        setTimeout(() => {
            document.querySelectorAll('.alert').forEach(alert => {
                alert.style.opacity = '0';
                setTimeout(() => {
                    if (alert.parentElement) {
                        alert.remove();
                    }
                }, 300);
            });
        }, 5000);
    }

    // Validation du mot de passe
    function validatePassword() {
        const password = newPasswordInput.value;
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
        
        // Mettre à jour l'affichage des exigences
        Object.entries(requirements).forEach(([req, valid]) => {
            const element = document.querySelector(`[data-requirement="${req}"]`);
            if (element) {
                element.classList.toggle('valid', valid);
            }
        });
        
        // Validation globale
        const isValid = Object.values(requirements).every(Boolean);
        if (!isValid) {
            newPasswordInput.setCustomValidity('Le mot de passe ne répond pas à toutes les exigences');
        } else {
            newPasswordInput.setCustomValidity('');
        }
    }

    // Ouverture du modal d'ajout d'adresse
    function openAddressModal(addressData = null) {
        const modalTitle = document.getElementById('addressModalTitle');
        const addressIdInput = document.getElementById('addressId');
        
        // Réinitialiser le formulaire
        addressForm.reset();
        
        if (addressData) {
            // Mode édition
            modalTitle.textContent = 'Modifier l\'adresse';
            addressIdInput.value = addressData.id;
            
            // Remplir les champs du formulaire
            document.getElementById('address_type').value = addressData.addressType;
            document.getElementById('street_address').value = addressData.streetAddress;
            document.getElementById('apartment').value = addressData.apartment || '';
            document.getElementById('postal_code').value = addressData.postalCode;
            document.getElementById('city').value = addressData.city;
            document.getElementById('country').value = addressData.country;
            document.getElementById('is_default').checked = addressData.isDefault;
        } else {
            // Mode ajout
            modalTitle.textContent = 'Ajouter une adresse';
            addressIdInput.value = '';
        }
        
        // Afficher le modal
        if (typeof window.openModal === 'function') {
            window.openModal(addressModal);
        } else {
            addressModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Édition d'une adresse
    function editAddress(addressId) {
        // Dans une application réelle, vous feriez une requête AJAX pour récupérer les données
        // Simulation de données pour l'exemple
        const addressData = {
            id: addressId,
            addressType: 'SHIPPING', // ou 'BILLING' ou 'BOTH'
            streetAddress: '123 Rue Exemple',
            apartment: 'Apt 42',
            postalCode: '75000',
            city: 'Paris',
            country: 'France',
            isDefault: true
        };
        
        openAddressModal(addressData);
    }

    // Suppression d'une adresse
    function deleteAddress(addressId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) {
            // Dans une application réelle, vous effectueriez une requête AJAX
            // Pour l'exemple, créons un formulaire et soumettons-le
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/profile/address/delete/';
            
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrfmiddlewaretoken';
            csrfInput.value = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            const addressIdInput = document.createElement('input');
            addressIdInput.type = 'hidden';
            addressIdInput.name = 'address_id';
            addressIdInput.value = addressId;
            
            form.appendChild(csrfInput);
            form.appendChild(addressIdInput);
            document.body.appendChild(form);
            form.submit();
        }
    }

    // Navigation par paramètre URL
    function handleUrlNavigation() {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        
        if (section) {
            const targetNavItem = document.querySelector(`.profile-nav .nav-item[data-section="${section}"]`);
            const targetSection = document.getElementById(section);
            
            if (targetNavItem && targetSection) {
                profileNavItems.forEach(navItem => {
                    if (navItem.classList.contains('logout')) return;
                    navItem.classList.remove('active');
                });
                targetNavItem.classList.add('active');
                
                profileSections.forEach(section => {
                    section.classList.remove('active');
                });
                targetSection.classList.add('active');
            }
        }
    }

    // Vérifier l'URL au chargement
    handleUrlNavigation();
    
    // Écouter les changements d'état de l'historique
    window.addEventListener('popstate', handleUrlNavigation);
});