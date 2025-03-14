document.addEventListener('DOMContentLoaded', function () {
    // 🔹 Récupération des éléments du DOM
    const categoryModal = document.getElementById('categoryModal');
    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const closeButtons = document.querySelectorAll('.close-modal');

    // 📌 Formulaire et champs
    const categoryForm = categoryModal.querySelector('form');
    const modalTitle = document.getElementById('modalTitle');
    const buttonText = categoryForm.querySelector('.button-text');
    
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
    const icons = ['fa-box', 'fa-tag', 'fa-list', 'fa-folder', 'fa-archive', 'fa-cube', 'fa-gift', 'fa-shopping-bag'];

    // 🔹 Ajout des icônes à la grille
    icons.forEach(icon => {
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-item';
        iconItem.innerHTML = `<i class="fas ${icon}"></i>`;
        iconItem.addEventListener('click', () => {
            document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
            iconItem.classList.add('selected');
            categoryIconInput.value = icon;
        });
        iconGrid.appendChild(iconItem);
    });

    // 📌 Gestion du bouton "Ajouter Catégorie"
    addCategoryBtn.addEventListener('click', function () {
        resetForm();
        categoryForm.action = `${window.location.origin}/categories/add/`; // Correction URL
        modalTitle.textContent = "Ajouter une catégorie";
        buttonText.textContent = "Ajouter";
        categoryModal.classList.add('active');
    });

    // 📌 Gestion des boutons d'édition
    document.querySelectorAll('.edit-category').forEach(button => {
        button.addEventListener('click', function () {
            const categoryData = this.dataset;

            // 🔹 Mise à jour du formulaire
            categoryForm.action = `${window.location.origin}/categories/edit/${categoryData.id}/`;
            categoryIdInput.value = categoryData.id;
            categoryNameInput.value = categoryData.name;
            categoryDescriptionInput.value = categoryData.description;
            categoryIconInput.value = categoryData.icon;
            categoryColorInput.value = categoryData.color;
            categoryFeaturedInput.checked = categoryData.featured === 'true';

            // 🔹 Sélection de l'icône correspondante
            document.querySelectorAll('.icon-item').forEach(item => {
                if (item.querySelector('i').classList.contains(categoryData.icon)) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });

            // 🔹 Gestion de l'image actuelle
            const currentImage = categoryForm.querySelector('.current-image');
            if (currentImage) currentImage.remove();

            if (categoryData.image) {
                const preview = document.createElement('div');
                preview.className = 'current-image';
                preview.innerHTML = `<img src="${categoryData.image}" alt="Aperçu" style="max-width: 100px;">`;
                categoryImageInput.parentNode.insertBefore(preview, categoryImageInput);
            }

            // 🔹 Affichage du modal
            modalTitle.textContent = "Modifier une catégorie";
            buttonText.textContent = "Modifier";
            categoryModal.classList.add('active');
        });
    });

    // 📌 Gestion des boutons de suppression
    document.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', function () {
            const categoryId = this.dataset.id;
            document.getElementById('deleteCategoryId').value = categoryId;
            document.getElementById('deleteCategoryForm').action = `${window.location.origin}/categories/delete/`;
            deleteCategoryModal.classList.add('active');
        });
    });

    // 📌 Gestion de la fermeture des modals
    closeButtons.forEach(button => {
        button.addEventListener('click', function () {
            categoryModal.classList.remove('active');
            deleteCategoryModal.classList.remove('active');
        });
    });

    // 📌 Fermeture des modals en cliquant à l'extérieur
    window.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            categoryModal.classList.remove('active');
            deleteCategoryModal.classList.remove('active');
        }
    });

    // 📌 Sélecteur de couleur
    categoryColorInput.addEventListener('input', function (e) {
        this.style.backgroundColor = e.target.value;
    });
    categoryColorInput.style.backgroundColor = categoryColorInput.value;

    // 📌 Gestion des messages d'alerte (auto-fermeture après 3 secondes)
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.remove();
            }, 300);
        }, 3000);
    });

    // 📌 Fonction de recherche en temps réel
    const searchInput = document.querySelector('input[name="search"]');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function () {
            const searchTerm = this.value.toLowerCase().trim();
            document.querySelectorAll('.category-card').forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('p').textContent.toLowerCase();
                const isVisible = name.includes(searchTerm) || description.includes(searchTerm);
                card.style.display = isVisible ? 'block' : 'none';
            });
        }, 300));
    }

    // 📌 Fonction de réinitialisation du formulaire
    function resetForm() {
        categoryForm.reset();
        categoryIdInput.value = '';
        categoryColorInput.value = '#6b21a8';
        categoryColorInput.style.backgroundColor = '#6b21a8';
        categoryIconInput.value = 'fa-box';
        buttonText.textContent = "Ajouter";

        // Nettoyage de l'aperçu d'image si présent
        const currentImage = categoryForm.querySelector('.current-image');
        if (currentImage) {
            currentImage.remove();
        }

        // Désélection des icônes
        document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
    }

    // 📌 Fonction debounce pour la recherche
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // 📌 Prévisualisation de l'image
    categoryImageInput?.addEventListener('change', function (e) {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = document.createElement('div');
                preview.className = 'current-image';
                preview.innerHTML = `<img src="${e.target.result}" alt="Aperçu" style="max-width: 100px;">`;

                const currentPreview = categoryForm.querySelector('.current-image');
                if (currentPreview) {
                    currentPreview.remove();
                }

                categoryImageInput.parentNode.insertBefore(preview, categoryImageInput);
            };
            reader.readAsDataURL(file);
        }
    });
});