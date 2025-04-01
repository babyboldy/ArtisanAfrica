// categories.js - Gestion des catégories du dashboard avec interactions améliorées

document.addEventListener('DOMContentLoaded', function () {
    // 🔹 Récupération des éléments du DOM
    const categoryModal = document.getElementById('categoryModal');
    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const closeButtons = document.querySelectorAll('.close-modal, .close-modal2');

    // 📌 Formulaire et champs
    const categoryForm = categoryModal?.querySelector('form');
    const modalTitle = document.getElementById('modalTitle');
    const buttonText = categoryForm?.querySelector('.button-text');
    
    // Champs du formulaire
    const categoryIdInput = document.getElementById('categoryId');
    const categoryNameInput = document.getElementById('categoryName');
    const categoryDescriptionInput = document.getElementById('categoryDescription');
    const categoryIconInput = document.getElementById('categoryIcon');
    const categoryColorInput = document.getElementById('categoryColor');
    const categoryImageInput = document.getElementById('categoryImage');
    const categoryFeaturedInput = document.getElementById('categoryFeatured');

    // 📌 Grille d'icônes
    const iconGrid = document.getElementById('iconGrid');
    const icons = [
        'fa-box', 'fa-tag', 'fa-list', 'fa-folder', 'fa-archive', 'fa-cube', 
        'fa-gift', 'fa-shopping-bag', 'fa-tshirt', 'fa-mobile-alt', 'fa-laptop', 
        'fa-headphones', 'fa-chair', 'fa-utensils', 'fa-car', 'fa-book',
        'fa-hammer', 'fa-paint-brush', 'fa-camera', 'fa-baseball-ball',
        'fa-bicycle', 'fa-football-ball', 'fa-gamepad', 'fa-guitar',
        'fa-leaf', 'fa-heart', 'fa-gem', 'fa-baby', 'fa-home', 'fa-dog', 'fa-cat'
    ];

    // 🔹 Initialisation
    initIconGrid();
    initEventListeners();
    initSearchFilter();
    initAnimations();

    // 🔹 Fonctions d'initialisation
    function initIconGrid() {
        if (!iconGrid) return;

        // Ajouter les icônes à la grille
        icons.forEach(icon => {
            const iconItem = document.createElement('div');
            iconItem.className = 'icon-item';
            iconItem.innerHTML = `<i class="fas ${icon}"></i>`;
            iconItem.setAttribute('data-icon', icon);
            iconItem.addEventListener('click', () => {
                document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
                iconItem.classList.add('selected');
                if (categoryIconInput) categoryIconInput.value = icon;
                
                // Animation de confirmation
                iconItem.classList.add('pulse-animation');
                setTimeout(() => {
                    iconItem.classList.remove('pulse-animation');
                }, 500);
            });
            iconGrid.appendChild(iconItem);
        });
    }

    function initEventListeners() {
        // 📌 Ajout d'une catégorie
        if (addCategoryBtn && categoryForm && modalTitle && buttonText) {
            addCategoryBtn.addEventListener('click', function () {
                resetForm();
                categoryForm.action = `${window.location.origin}/categories/add/`;
                modalTitle.textContent = "Ajouter une catégorie";
                buttonText.textContent = "Ajouter";
                openModal(categoryModal);
            });
        }

        // 📌 Édition d'une catégorie
        document.querySelectorAll('.edit-category').forEach(button => {
            button.addEventListener('click', function () {
                if (!categoryForm || !modalTitle || !buttonText) return;
                
                const categoryData = this.dataset;

                // 🔹 Mise à jour du formulaire avec animation
                categoryForm.action = `${window.location.origin}/categories/edit/${categoryData.id}/`;
                
                // Animation d'entrée des champs
                animateFormFields(() => {
                    categoryIdInput.value = categoryData.id;
                    categoryNameInput.value = categoryData.name;
                    categoryDescriptionInput.value = categoryData.description;
                    categoryIconInput.value = categoryData.icon;
                    categoryColorInput.value = categoryData.color;
                    categoryFeaturedInput.checked = categoryData.featured === 'true';

                    // 🔹 Sélection de l'icône correspondante
                    document.querySelectorAll('.icon-item').forEach(item => {
                        const iconClass = item.querySelector('i').className;
                        item.classList.toggle('selected', iconClass.includes(categoryData.icon));
                    });

                    // Mise à jour du coloris
                    categoryColorInput.style.backgroundColor = categoryData.color;
                });

                // 🔹 Gestion de l'image actuelle
                const currentImage = categoryForm.querySelector('.current-image');
                if (currentImage) currentImage.remove();

                if (categoryData.image) {
                    const preview = document.createElement('div');
                    preview.className = 'current-image fade-in';
                    preview.innerHTML = `
                        <div class="preview-item">
                            <img src="${categoryData.image}" alt="Aperçu">
                            <button type="button" class="remove-image">×</button>
                        </div>
                    `;
                    
                    // Ajouter l'événement pour supprimer l'image
                    const removeBtn = preview.querySelector('.remove-image');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function() {
                            preview.classList.add('fade-out');
                            setTimeout(() => {
                                preview.remove();
                                // Ajout d'un champ caché pour indiquer la suppression de l'image
                                const removeImageInput = document.createElement('input');
                                removeImageInput.type = 'hidden';
                                removeImageInput.name = 'remove_image';
                                removeImageInput.value = 'true';
                                categoryForm.appendChild(removeImageInput);
                            }, 300);
                        });
                    }
                    
                    categoryImageInput.parentNode.insertBefore(preview, categoryImageInput.nextSibling);
                }

                // 🔹 Affichage du modal
                modalTitle.textContent = "Modifier une catégorie";
                buttonText.textContent = "Enregistrer les modifications";
                openModal(categoryModal);
            });
        });

        // 📌 Suppression d'une catégorie
        document.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', function () {
                const categoryId = this.dataset.id;
                const categoryName = this.closest('.category-card').querySelector('h3').textContent;
                
                if (document.getElementById('deleteCategoryId')) {
                    document.getElementById('deleteCategoryId').value = categoryId;
                }
                
                // Ajouter le nom de la catégorie à supprimer dans la confirmation
                const confirmText = document.querySelector('#deleteCategoryModal .modal-body p:first-child');
                if (confirmText) {
                    confirmText.innerHTML = `Voulez-vous vraiment supprimer la catégorie <strong>"${categoryName}"</strong> ?`;
                }
                
                if (document.getElementById('deleteCategoryForm')) {
                    document.getElementById('deleteCategoryForm').action = `${window.location.origin}/categories/delete/`;
                }
                
                openModal(deleteCategoryModal);
            });
        });

        // 📌 Fermeture des modals
        closeButtons.forEach(button => {
            button.addEventListener('click', closeModals);
        });

        // 📌 Fermeture des modals en cliquant à l'extérieur
        window.addEventListener('click', function (event) {
            if (event.target.classList.contains('modal')) {
                closeModals();
            }
        });

        // 📌 Fermeture des modals avec la touche Echap
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeModals();
            }
        });

        // 📌 Sélecteur de couleur
        if (categoryColorInput) {
            categoryColorInput.addEventListener('input', function (e) {
                this.style.backgroundColor = e.target.value;
                
                // Animation subtile
                this.closest('.color-field').classList.add('pulse');
                setTimeout(() => {
                    this.closest('.color-field').classList.remove('pulse');
                }, 500);
            });
            categoryColorInput.style.backgroundColor = categoryColorInput.value;
        }

        // 📌 Prévisualisation de l'image
        if (categoryImageInput) {
            categoryImageInput.addEventListener('change', function () {
                const file = this.files[0];
                if (!file) return;

                // Vérifier si l'image est valide
                if (!file.type.match('image.*')) {
                    showToast('Veuillez sélectionner une image valide', 'error');
                    return;
                }

                // Vérifier la taille du fichier (max 2 MB)
                if (file.size > 2 * 1024 * 1024) {
                    showToast('L\'image ne doit pas dépasser 2 Mo', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    const currentPreview = categoryForm.querySelector('.current-image');
                    if (currentPreview) currentPreview.remove();

                    const preview = document.createElement('div');
                    preview.className = 'current-image';
                    preview.innerHTML = `
                        <div class="preview-item slide-in">
                            <img src="${e.target.result}" alt="Aperçu">
                            <button type="button" class="remove-image">×</button>
                        </div>
                    `;
                    
                    // Ajouter l'événement pour supprimer la prévisualisation
                    const removeBtn = preview.querySelector('.remove-image');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function() {
                            preview.querySelector('.preview-item').classList.add('slide-out');
                            setTimeout(() => {
                                preview.remove();
                                categoryImageInput.value = '';
                            }, 300);
                        });
                    }
                    
                    categoryImageInput.parentNode.insertBefore(preview, categoryImageInput.nextSibling);
                };
                reader.readAsDataURL(file);
            });
        }
    }

    function initSearchFilter() {
        // 📌 Fonction de recherche en temps réel
        const searchInput = document.querySelector('input[name="search"]');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function () {
                const searchTerm = this.value.toLowerCase().trim();
                const categoryCards = document.querySelectorAll('.category-card');
                let visibleCount = 0;

                categoryCards.forEach(card => {
                    const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
                    const description = card.querySelector('p')?.textContent.toLowerCase() || '';
                    const isVisible = name.includes(searchTerm) || description.includes(searchTerm);
                    
                    if (isVisible) {
                        card.style.display = 'flex';
                        visibleCount++;
                        if (searchTerm !== '') {
                            // Highlight des termes de recherche
                            highlightSearchTerm(card, searchTerm);
                        } else {
                            // Supprimer les highlights
                            removeHighlights(card);
                        }
                    } else {
                        // Animation de sortie
                        card.classList.add('fade-out');
                        setTimeout(() => {
                            card.style.display = 'none';
                            card.classList.remove('fade-out');
                        }, 300);
                    }
                });

                // Mettre à jour le compteur de résultats
                const countDisplay = document.querySelector('.toolbar-right p');
                if (countDisplay) {
                    countDisplay.textContent = `${visibleCount} Catégorie(s)`;
                    
                    // Ajouter une animation pour mettre en évidence le changement
                    countDisplay.classList.add('pulse');
                    setTimeout(() => {
                        countDisplay.classList.remove('pulse');
                    }, 500);
                }

                // Afficher un message si aucun résultat
                let emptyMessage = document.querySelector('.empty-search-result');
                if (visibleCount === 0) {
                    if (!emptyMessage) {
                        emptyMessage = document.createElement('div');
                        emptyMessage.className = 'empty-search-result fade-in';
                        emptyMessage.innerHTML = `
                            <div class="no-results">
                                <i class="fas fa-search"></i>
                                <h3>Aucun résultat trouvé</h3>
                                <p>Aucune catégorie ne correspond à votre recherche "${searchTerm}".</p>
                                <button class="btn btn-outline reset-search">Réinitialiser la recherche</button>
                            </div>
                        `;
                        
                        const categoriesGrid = document.querySelector('.categories-grid');
                        if (categoriesGrid) {
                            categoriesGrid.appendChild(emptyMessage);
                            
                            // Ajouter l'événement pour réinitialiser la recherche
                            const resetBtn = emptyMessage.querySelector('.reset-search');
                            if (resetBtn) {
                                resetBtn.addEventListener('click', function() {
                                    searchInput.value = '';
                                    searchInput.dispatchEvent(new Event('input'));
                                    searchInput.focus();
                                });
                            }
                        }
                    }
                } else if (emptyMessage) {
                    emptyMessage.classList.add('fade-out');
                    setTimeout(() => {
                        emptyMessage.remove();
                    }, 300);
                }
            }, 300));
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
            
            .pulse-animation {
                animation: pulse 0.5s ease;
            }
            
            .no-results {
                text-align: center;
                padding: 3rem 2rem;
                background-color: white;
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-sm);
                width: 100%;
                max-width: 500px;
                margin: 2rem auto;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            
            .no-results i {
                font-size: 3rem;
                color: var(--gray-400);
                margin-bottom: 1rem;
            }
            
            .no-results h3 {
                font-size: 1.5rem;
                color: var(--text-primary);
                margin-bottom: 0.5rem;
            }
            
            .no-results p {
                color: var(--text-secondary);
                margin-bottom: 1.5rem;
            }
            
            .highlight {
                background-color: rgba(107, 33, 168, 0.2);
                color: var(--primary-dark);
                padding: 0 2px;
                border-radius: 2px;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
        
        // Ajouter une animation d'entrée aux cartes de catégories
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50 * index); // Délai progressif pour un effet en cascade
        });
    }

    // 📌 Fonctions utilitaires
    function resetForm() {
        if (!categoryForm) return;
        
        categoryForm.reset();
        if (categoryIdInput) categoryIdInput.value = '';
        if (categoryColorInput) {
            categoryColorInput.value = '#6b21a8';
            categoryColorInput.style.backgroundColor = '#6b21a8';
        }
        if (categoryIconInput) categoryIconInput.value = 'fa-box';
        if (buttonText) buttonText.textContent = "Ajouter";

        // Nettoyage de l'aperçu d'image si présent
        const currentImage = categoryForm.querySelector('.current-image');
        if (currentImage) {
            currentImage.classList.add('fade-out');
            setTimeout(() => {
                currentImage.remove();
            }, 300);
        }

        // Désélection des icônes
        document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
        
        // Sélection de l'icône par défaut
        const defaultIcon = document.querySelector('.icon-item[data-icon="fa-box"]');
        if (defaultIcon) {
            defaultIcon.classList.add('selected');
            setTimeout(() => {
                // Scroll vers l'icône sélectionnée
                iconGrid.scrollTop = defaultIcon.offsetTop - iconGrid.offsetTop - 10;
            }, 100);
        }
    }

    function openModal(modal) {
        if (!modal) return;
        
        // Animation d'ouverture
        document.body.style.overflow = 'hidden'; // Empêcher le défilement
        modal.classList.add('active');
        
        // Focus sur le premier champ (pour meilleure accessibilité)
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]):not([type="color"]), select, textarea');
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
        const formFields = categoryForm.querySelectorAll('.form-group');
        
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
    
    function highlightSearchTerm(card, term) {
        // Supprimer les highlights existants
        removeHighlights(card);
        
        // Ajouter des highlights au titre
        const title = card.querySelector('h3');
        if (title) {
            const content = title.textContent;
            const regex = new RegExp(`(${term})`, 'gi');
            title.innerHTML = content.replace(regex, '<span class="highlight">$1</span>');
        }
        
        // Ajouter des highlights à la description
        const description = card.querySelector('p');
        if (description) {
            const content = description.textContent;
            const regex = new RegExp(`(${term})`, 'gi');
            description.innerHTML = content.replace(regex, '<span class="highlight">$1</span>');
        }
    }
    
    function removeHighlights(card) {
        const elements = [card.querySelector('h3'), card.querySelector('p')];
        
        elements.forEach(el => {
            if (el) {
                const content = el.textContent;
                el.innerHTML = content;
            }
        });
    }
});