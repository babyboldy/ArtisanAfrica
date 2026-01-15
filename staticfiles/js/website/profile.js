// profile.js - Script pour la page profil utilisateur

document.addEventListener('DOMContentLoaded', function() {
    // Navigation entre les sections
    const navItems = document.querySelectorAll('.profile-nav .nav-item');
    const sections = document.querySelectorAll('.profile-section');
    
    navItems.forEach(item => {
        if (item.classList.contains('logout')) return; // Ignorer le lien de déconnexion
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetSection = this.getAttribute('data-section');
            
            // Désactiver tous les liens et sections
            navItems.forEach(navItem => navItem.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Activer le lien et la section cliqués
            this.classList.add('active');
            document.getElementById(targetSection).classList.add('active');
            
            // Mettre à jour l'URL sans rechargement
            history.pushState(null, null, this.getAttribute('href'));
            
            // Pour le mobile, scroll automatique vers le contenu
            if (window.innerWidth < 992) {
                document.querySelector('.profile-content').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Gestion de l'upload d'image de profil
    const profileImageUpload = document.getElementById('profileImageUpload');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const removePhotoBtn = document.getElementById('removePhoto');
    const removePhotoInput = document.getElementById('removePhotoInput');
    
    if (profileImageUpload && profileImagePreview) {
        profileImageUpload.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    profileImagePreview.src = e.target.result;
                    removePhotoInput.value = 'false';
                };
                
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
    
    if (removePhotoBtn && removePhotoInput) {
        removePhotoBtn.addEventListener('click', function() {
            profileImagePreview.src = '/static/images/default-avatar.png';
            profileImageUpload.value = '';
            removePhotoInput.value = 'true';
        });
    }
    
    // Gestion des alertes
    const closeAlertBtns = document.querySelectorAll('.close-alert');
    
    closeAlertBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.alert').remove();
        });
    });
    
    // Validation du mot de passe
    const newPasswordInput = document.getElementById('new_password');
    const requirements = document.querySelectorAll('.requirement');
    
    if (newPasswordInput && requirements.length) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            
            // Définir les règles de validation
            const rules = {
                length: password.length >= 8,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                number: /[0-9]/.test(password),
                special: /[^A-Za-z0-9]/.test(password)
            };
            
            // Mettre à jour les indicateurs visuels
            requirements.forEach(req => {
                const rule = req.getAttribute('data-requirement');
                if (rules[rule]) {
                    req.classList.add('valid');
                } else {
                    req.classList.remove('valid');
                }
            });
        });
    }
    
    // Afficher/masquer les mots de passe
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type');
            
            if (type === 'password') {
                input.setAttribute('type', 'text');
                this.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                input.setAttribute('type', 'password');
                this.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
    });
    
    // Gestion du modal d'adresses
    const modal = document.getElementById('addressModal');
    const addAddressBtn = document.getElementById('addAddressBtn');
    const closeModalBtns = document.querySelectorAll('.close, .close-modal');
    const editAddressBtns = document.querySelectorAll('.btn-edit-address');
    const deleteAddressBtns = document.querySelectorAll('.btn-delete-address');
    const addressForm = document.getElementById('addressForm');
    const addressModalTitle = document.getElementById('addressModalTitle');
    const addressIdInput = document.getElementById('addressId');
    
    if (modal && addAddressBtn) {
        addAddressBtn.addEventListener('click', function() {
            // Réinitialiser le formulaire
            addressForm.reset();
            addressIdInput.value = '';
            addressModalTitle.textContent = 'Ajouter une adresse';
            
            // Afficher le modal
            modal.classList.add('active');
        });
    }
    
    if (closeModalBtns.length) {
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                modal.classList.remove('active');
            });
        });
    }
    
    // Fermer le modal en cliquant à l'extérieur
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Éditer une adresse
    if (editAddressBtns.length) {
        editAddressBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const addressId = this.getAttribute('data-id');
                
                // Ici, vous devriez idéalement charger les données de l'adresse via AJAX
                // Mais pour l'exemple, nous simulons simplement l'ouverture du modal
                addressIdInput.value = addressId;
                addressModalTitle.textContent = 'Modifier l\'adresse';
                
                // Afficher le modal
                modal.classList.add('active');
            });
        });
    }
    
    // Supprimer une adresse avec confirmation
    if (deleteAddressBtns.length) {
        deleteAddressBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const addressId = this.getAttribute('data-id');
                
                if (confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) {
                    // Ici, vous devriez idéalement envoyer une requête AJAX pour supprimer l'adresse
                    // Exemple:
                    fetch(`/profile/address/${addressId}/delete/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Supprimer la carte d'adresse du DOM
                            this.closest('.address-card').remove();
                            
                            // Afficher un message de succès
                            showNotification('Adresse supprimée avec succès', 'success');
                            
                            // Si plus d'adresses, afficher l'état vide
                            const addressCards = document.querySelectorAll('.address-card');
                            if (addressCards.length === 0) {
                                const addressContainer = document.querySelector('.addresses-container');
                                addressContainer.innerHTML = `
                                    <div class="empty-state">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <h3>Aucune adresse enregistrée</h3>
                                        <p>Vous n'avez pas encore ajouté d'adresse. Ajoutez une adresse pour faciliter vos achats.</p>
                                    </div>
                                    <div class="add-address-container">
                                        <button id="addAddressBtn" class="btn-primary">
                                            <i class="fas fa-plus"></i> Ajouter une adresse
                                        </button>
                                    </div>
                                `;
                                
                                // Réattacher l'événement au nouveau bouton
                                document.getElementById('addAddressBtn').addEventListener('click', function() {
                                    addressForm.reset();
                                    addressIdInput.value = '';
                                    addressModalTitle.textContent = 'Ajouter une adresse';
                                    modal.classList.add('active');
                                });
                            }
                        } else {
                            // Afficher un message d'erreur
                            showNotification(data.message || 'Une erreur est survenue', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        showNotification('Une erreur est survenue', 'error');
                    });
                }
            });
        });
    }
    
    // Fonction utilitaire pour afficher des notifications
    function showNotification(message, type) {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="close-alert">&times;</button>
        `;
        
        // Ajouter au conteneur de messages ou au corps du document
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.appendChild(notification);
        } else {
            // Créer un conteneur si nécessaire
            const container = document.createElement('div');
            container.className = 'messages-container';
            container.appendChild(notification);
            
            // Insérer après le header de profil
            const profileHeader = document.querySelector('.profile-header');
            if (profileHeader) {
                profileHeader.after(container);
            } else {
                // Fallback: insérer au début de .profile-page
                document.querySelector('.profile-page').prepend(container);
            }
        }
        
        // Attacher l'événement de fermeture
        notification.querySelector('.close-alert').addEventListener('click', function() {
            notification.remove();
        });
        
        // Auto-fermeture après 5 secondes
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    // Vérifier l'URL pour activer la section appropriée
    function checkUrlHash() {
        const hash = window.location.hash.substring(1); // Enlever le #
        if (hash) {
            const navItem = document.querySelector(`.nav-item[data-section="${hash}"]`);
            if (navItem) {
                navItem.click();
            }
        }
    }
    
    // Vérifier l'URL au chargement
    checkUrlHash();
    
    // Écouter les changements d'URL
    window.addEventListener('hashchange', checkUrlHash);
    
    // Script pour le menu utilisateur dans la navbar
    const userMenu = document.querySelector('.user-menu > a');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenu && userDropdown) {
        userMenu.addEventListener('click', function(e) {
            e.preventDefault();
            userDropdown.classList.toggle('show');
        });
        
        // Fermer le dropdown en cliquant ailleurs
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.user-menu')) {
                userDropdown.classList.remove('show');
            }
        });
    }
});