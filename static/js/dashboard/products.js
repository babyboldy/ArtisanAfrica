// products.js - Gestion des produits du dashboard avec interactions améliorées

document.addEventListener('DOMContentLoaded', function () {
    // 🎯 Sélection des éléments du DOM - Modals
    const productModal = document.getElementById('productModal');
    const deleteProductModal = document.getElementById('deleteProductModal');
    const addProductBtn = document.getElementById('addProductBtn');
    const closeButtons = document.querySelectorAll('.close-modal');

    // 🎯 Sélection des éléments du DOM - Formulaires
    const productForm = document.getElementById('productForm');
    const deleteProductForm = document.getElementById('deleteProductForm');
    const modalTitle = document.getElementById('modalTitle');

    // 🎯 Sélection des éléments du DOM - Images
    const imageInput = document.getElementById('productMedia');
    const imagePreview = document.getElementById('imagePreview');

    // Initialisation
    initFormEvents();
    initImageUpload();
    initFilterFunctions();
    initAnimations();

    // 🛍️ Initialisation des événements des formulaires
    function initFormEvents() {
        // Ajout d'un produit
        if (addProductBtn && productForm && modalTitle) {
            addProductBtn.addEventListener('click', function () {
                resetForm();
                productForm.action = '/products_admin/add/';
                modalTitle.textContent = "Ajouter un produit";
                openModal(productModal);
            });
        }

        // Édition d'un produit
        document.querySelectorAll('.edit-product').forEach(button => {
            button.addEventListener('click', function () {
                if (!productForm || !modalTitle) return;
                
                const productId = this.dataset.id;
                const productName = this.dataset.name;
                
                productForm.action = `/products_admin/edit/${productId}/`;
                modalTitle.innerHTML = `Modifier le produit <span class="product-name">"${productName}"</span>`;

                // Convertir les images enregistrées en tableau
                const mediaData = this.dataset.media
                    ? this.dataset.media.split(',').map(item => {
                        const [id, url] = item.split(':');
                        return { id: parseInt(id), url };
                    })
                    : [];

                // Remplir le formulaire avec les données existantes
                animateFormFields(() => {
                    fillFormWithProductData({
                        ...this.dataset,
                        media: mediaData
                    });
                });

                // Ouvrir le modal
                openModal(productModal);
            });
        });

        // Suppression d'un produit
        document.querySelectorAll('.delete-product').forEach(button => {
            button.addEventListener('click', function () {
                const productId = this.dataset.id;
                const productName = this.closest('.product-card').querySelector('h3')?.textContent || 'ce produit';
                const deleteIdInput = document.getElementById('deleteProductId');
                
                if (deleteIdInput) deleteIdInput.value = productId;
                
                // Ajouter le nom du produit dans la confirmation
                const confirmText = document.querySelector('#deleteProductModal .modal-body p');
                if (confirmText) {
                    confirmText.innerHTML = `Voulez-vous vraiment supprimer le produit <strong>"${productName}"</strong> ?`;
                }
                
                openModal(deleteProductModal);
            });
        });

        // Fermeture des modals
        closeButtons.forEach(button => {
            button.addEventListener('click', closeModals);
        });

        // Fermeture des modals en cliquant en dehors
        window.addEventListener('click', function (event) {
            if (event.target.classList.contains('modal')) {
                closeModals();
            }
        });

        // Fermeture des modals avec Echap
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeModals();
            }
        });
        
        // Validation du formulaire avant envoi
        if (productForm) {
            productForm.addEventListener('submit', function(e) {
                const requiredFields = productForm.querySelectorAll('[required]');
                let isValid = true;
                
                requiredFields.forEach(field => {
                    if (!field.value.trim()) {
                        isValid = false;
                        field.classList.add('error');
                        
                        // Créer ou mettre à jour le message d'erreur
                        let errorMsg = field.parentNode.querySelector('.error-message');
                        if (!errorMsg) {
                            errorMsg = document.createElement('div');
                            errorMsg.className = 'error-message';
                            field.parentNode.appendChild(errorMsg);
                        }
                        errorMsg.textContent = 'Ce champ est requis';
                        
                        // Animation d'erreur
                        field.classList.add('shake');
                        setTimeout(() => {
                            field.classList.remove('shake');
                        }, 500);
                    } else {
                        field.classList.remove('error');
                        const errorMsg = field.parentNode.querySelector('.error-message');
                        if (errorMsg) errorMsg.remove();
                    }
                });
                
                if (!isValid) {
                    e.preventDefault();
                    // Scroll vers le premier champ en erreur
                    const firstError = productForm.querySelector('.error');
                    if (firstError) {
                        firstError.focus();
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
                    showToast('Veuillez remplir tous les champs obligatoires', 'error');
                } else {
                    // Ajouter une animation de chargement
                    const submitBtn = productForm.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
                    }
                }
            });
            
            // Valider les champs à la sortie (blur)
            productForm.querySelectorAll('[required]').forEach(field => {
                field.addEventListener('blur', function() {
                    if (!this.value.trim()) {
                        this.classList.add('error');
                        // Créer ou mettre à jour le message d'erreur
                        let errorMsg = this.parentNode.querySelector('.error-message');
                        if (!errorMsg) {
                            errorMsg = document.createElement('div');
                            errorMsg.className = 'error-message';
                            this.parentNode.appendChild(errorMsg);
                        }
                        errorMsg.textContent = 'Ce champ est requis';
                    } else {
                        this.classList.remove('error');
                        const errorMsg = this.parentNode.querySelector('.error-message');
                        if (errorMsg) errorMsg.remove();
                    }
                });
                
                // Supprimer l'erreur lors de la saisie
                field.addEventListener('input', function() {
                    if (this.value.trim()) {
                        this.classList.remove('error');
                        const errorMsg = this.parentNode.querySelector('.error-message');
                        if (errorMsg) errorMsg.remove();
                    }
                });
            });
        }
    }

    // 🖼️ Gestion de l'upload d'images
    function initImageUpload() {
        if (!imageInput || !imagePreview) return;

        // Événement de changement de fichiers
        imageInput.addEventListener('change', handleImageUpload);

        // Drag & drop
        const dropZone = document.querySelector('.image-upload');
        if (dropZone) {
            // Prévenir le comportement par défaut sur les événements de drag
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            // Highlight sur drag enter et drag over
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('drag-hover');
                }, false);
            });

            // Enlever le highlight sur drag leave et drop
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('drag-hover');
                }, false);
            });

            // Gérer le drop de fichiers
            dropZone.addEventListener('drop', function(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                
                if (files.length > 0) {
                    imageInput.files = files; // Associer les fichiers à l'input
                    handleFiles(files);
                }
            }, false);
            
            // Cliquer sur la zone pour ouvrir le sélecteur de fichiers
            dropZone.addEventListener('click', function() {
                imageInput.click();
            });
        }

        // Supprimer les images existantes
        document.querySelectorAll('.remove-image[data-media-id]').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const mediaId = this.dataset.mediaId;
                const previewItem = this.closest('.preview-item');

                if (confirm('Voulez-vous vraiment supprimer cette image ?')) {
                    fetch(`/products_admin/image/delete/${mediaId}/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            previewItem.classList.add('fade-out');
                            setTimeout(() => {
                                previewItem.remove();
                            }, 300);
                            showToast('Image supprimée avec succès', 'success');
                        } else {
                            showToast('Erreur lors de la suppression de l\'image', 'error');
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

    // 🔍 Gestion des filtres et recherche
    function initFilterFunctions() {
        const searchInput = document.querySelector('.search-box input[name="search"]');
        const categorySelect = document.querySelector('select[name="category"]');
        const statusSelect = document.querySelector('select[name="status"]');
        const filterForm = document.getElementById('filterForm');

        if (!filterForm) return;

        // Mise à jour automatique sur changement de filtre
        [categorySelect, statusSelect].forEach(select => {
            if (select) {
                select.addEventListener('change', function() {
                    // Animation du select
                    this.classList.add('pulse');
                    setTimeout(() => {
                        this.classList.remove('pulse');
                        filterForm.submit();
                    }, 300);
                });
            }
        });

        // Recherche avec debounce
        if (searchInput) {
            let typingTimer;
            const typingDelay = 500;

            searchInput.addEventListener('input', function() {
                clearTimeout(typingTimer);
                
                // Animation de l'icône de recherche
                const searchIcon = this.parentNode.querySelector('i');
                if (searchIcon) {
                    searchIcon.classList.add('fa-spin');
                    setTimeout(() => {
                        searchIcon.classList.remove('fa-spin');
                    }, 500);
                }
                
                typingTimer = setTimeout(() => {
                    if (this.value.trim().length >= 2 || this.value.trim().length === 0) {
                        // Afficher un indicateur de chargement
                        const loadingIndicator = document.createElement('div');
                        loadingIndicator.className = 'search-loading';
                        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        this.parentNode.appendChild(loadingIndicator);
                        
                        filterForm.submit();
                    }
                }, typingDelay);
            });

            // Annuler le timer si l'utilisateur continue à taper
            searchInput.addEventListener('keydown', function() {
                clearTimeout(typingTimer);
            });
            
            // Ajouter un bouton pour effacer la recherche
            if (searchInput.value) {
                addClearSearchButton(searchInput);
            }
            
            searchInput.addEventListener('input', function() {
                if (this.value) {
                    addClearSearchButton(this);
                } else {
                    const clearBtn = this.parentNode.querySelector('.clear-search');
                    if (clearBtn) clearBtn.remove();
                }
            });
        }
    }
    
    function initAnimations() {
        // Ajouter des animations CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(20px); }
            }
            
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(30px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes slideOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(30px); }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-5px); }
                40%, 80% { transform: translateX(5px); }
            }
            
            .fade-in {
                animation: fadeIn 0.3s ease forwards;
            }
            
            .fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
            
            .slide-in {
                animation: slideIn 0.3s ease forwards;
            }
            
            .slide-out {
                animation: slideOut 0.3s ease forwards;
            }
            
            .pulse {
                animation: pulse 0.3s ease;
            }
            
            .shake {
                animation: shake 0.5s ease;
            }
            
            /* Style pour les champs en erreur */
            .error {
                border-color: var(--danger) !important;
                background-color: rgba(239, 68, 68, 0.05) !important;
            }
            
            .error-message {
                color: var(--danger);
                font-size: 0.85rem;
                margin-top: 0.25rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            
            .error-message::before {
                content: "⚠️";
                font-size: 0.9rem;
            }
            
            /* Stylisation du nom du produit dans le titre du modal */
            .product-name {
                font-weight: 500;
                color: var(--primary);
                font-size: 0.9em;
                opacity: 0.9;
            }
            
            /* Bouton pour effacer la recherche */
            .clear-search {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--gray-400);
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .clear-search:hover {
                color: var(--danger);
                background-color: rgba(239, 68, 68, 0.1);
            }
            
            /* Indicateur de chargement pour la recherche */
            .search-loading {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--primary);
                padding: 5px;
            }
        `;
        document.head.appendChild(style);
        
        // Animer l'entrée des cartes de produits
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50 * index); // Délai progressif pour un effet en cascade
        });
    }

    // 🛠️ Fonctions utilitaires
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleImageUpload(e) {
        handleFiles(this.files);
    }

    function handleFiles(files) {
        files = [...files];
        
        // Vérifier les types de fichiers
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length !== files.length) {
            showToast('Certains fichiers ne sont pas des images valides', 'warning');
        }
        
        if (validFiles.length > 0) {
            showToast(`${validFiles.length} image(s) ajoutée(s)`, 'success');
        }
        
        validFiles.forEach((file, index) => {
            setTimeout(() => {
                previewImage(file);
            }, 100 * index); // Ajouter un délai pour créer un effet d'apparition progressive
        });
    }

    function previewImage(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = createImagePreview(e.target.result);
            if (imagePreview) {
                preview.classList.add('fade-in');
                imagePreview.appendChild(preview);
            }
        };
        reader.readAsDataURL(file);
    }

    function createImagePreview(src) {
        const preview = document.createElement('div');
        preview.className = 'preview-item';
        preview.innerHTML = `
            <img src="${src}" alt="Aperçu">
            <button type="button" class="remove-image">×</button>
        `;

        preview.querySelector('.remove-image').addEventListener('click', function() {
            preview.classList.add('fade-out');
            setTimeout(() => {
                preview.remove();
            }, 300);
        });

        return preview;
    }

    function fillFormWithProductData(data) {
        // Vérifier que tous les éléments nécessaires existent
        const fields = {
            id: document.getElementById('productId'),
            name: document.getElementById('productName'),
            description: document.getElementById('productDescription'),
            price: document.getElementById('productPrice'),
            stock: document.getElementById('productStock'),
            category: document.getElementById('productCategory'),
            status: document.getElementById('productStatus'),
            featured: document.getElementById('productFeatured'),
            sku: document.getElementById('productSku'),
            barcode: document.getElementById('productBarcode'),
            weight: document.getElementById('productWeight')
        };

        // Remplir les champs
        if (fields.id) fields.id.value = data.id || '';
        if (fields.name) fields.name.value = data.name || '';
        if (fields.description) fields.description.value = data.description || '';
        if (fields.price) fields.price.value = data.price || '';
        if (fields.stock) fields.stock.value = data.stock || '';
        if (fields.category) fields.category.value = data.category || '';
        if (fields.status) fields.status.value = data.status || '';
        if (fields.featured) fields.featured.checked = data.featured === 'true';
        if (fields.sku) fields.sku.value = data.sku || '';
        if (fields.barcode) fields.barcode.value = data.barcode || '';
        if (fields.weight) fields.weight.value = data.weight || '';

        // Prévisualisation des images
        if (imagePreview) {
            imagePreview.innerHTML = '';

            if (data.media && data.media.length > 0) {
                data.media.forEach((media, index) => {
                    setTimeout(() => {
                        const preview = document.createElement('div');
                        preview.className = 'preview-item fade-in';
                        preview.innerHTML = `
                            <img src="${media.url}" alt="Preview">
                            <button type="button" class="remove-image" data-media-id="${media.id}">×</button>
                        `;
                        
                        // Ajouter un événement pour supprimer l'image
                        preview.querySelector('.remove-image').addEventListener('click', function() {
                            if (confirm('Voulez-vous vraiment supprimer cette image ?')) {
                                fetch(`/products_admin/image/delete/${media.id}/`, {
                                    method: 'POST',
                                    headers: {
                                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
                                        'Content-Type': 'application/json'
                                    }
                                })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        preview.classList.add('fade-out');
                                        setTimeout(() => {
                                            preview.remove();
                                        }, 300);
                                        showToast('Image supprimée avec succès', 'success');
                                    } else {
                                        showToast('Erreur lors de la suppression', 'error');
                                    }
                                });
                            }
                        });
                        
                        imagePreview.appendChild(preview);
                    }, 100 * index); // Délai pour l'effet d'apparition progressive
                });
            }
        }
    }

    function resetForm() {
        if (productForm) productForm.reset();
        
        if (imagePreview) {
            // Animation de sortie des images
            const items = imagePreview.querySelectorAll('.preview-item');
            items.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('fade-out');
                    setTimeout(() => {
                        item.remove();
                    }, 300);
                }, 50 * index);
            });
        }
        
        const productIdInput = document.getElementById('productId');
        if (productIdInput) productIdInput.value = '';
        
        // Supprimer tous les messages d'erreur
        document.querySelectorAll('.error-message').forEach(msg => msg.remove());
        document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
    }

    function openModal(modal) {
        if (!modal) return;
        
        document.body.style.overflow = 'hidden'; // Empêcher le défilement
        modal.classList.add('active');
        
        // Focus sur le premier champ (pour meilleure accessibilité)
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
            if (firstInput) firstInput.focus();
        }, 300);
    }

    function closeModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = ''; // Permettre le défilement
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    function animateFormFields(callback) {
        const formFields = productForm.querySelectorAll('.form-group');
        
        // Masquer temporairement tous les champs
        formFields.forEach(field => {
            field.style.opacity = '0';
            field.style.transform = 'translateY(10px)';
        });
        
        // Exécuter le callback
        callback();
        
        // Animer l'apparition des champs un par un
        formFields.forEach((field, index) => {
            field.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            setTimeout(() => {
                field.style.opacity = '1';
                field.style.transform = 'translateY(0)';
            }, 50 * index);
        });
    }
    
    function addClearSearchButton(input) {
        // Supprimer tout bouton existant
        const existing = input.parentNode.querySelector('.clear-search');
        if (existing) existing.remove();
        
        // Créer et ajouter le bouton
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'clear-search';
        clearBtn.innerHTML = '<i class="fas fa-times"></i>';
        clearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            input.value = '';
            this.remove();
            // Soumettre le formulaire pour réinitialiser la recherche
            input.form.submit();
        });
        
        input.parentNode.appendChild(clearBtn);
    }
});