document.addEventListener('DOMContentLoaded', function () {
    // 🎯 Sélection des éléments du DOM - Modals
    const productModal = document.getElementById('productModal');
    const deleteProductModal = document.getElementById('deleteProductModal');
    const addProductBtn = document.getElementById('addProductBtn');
    const closeButtons = document.querySelectorAll('.close-modal');

    // 🎯 Sélection des éléments du DOM - Formulaires
    const productForm = document.getElementById('productForm');
    const deleteProductForm = document.getElementById('deleteProductForm');

    // 🎯 Sélection des éléments du DOM - Images
    const imageInput = document.getElementById('productMedia');
    const imagePreview = document.getElementById('imagePreview');

    // 🛍️ Gestion du bouton d'ajout d'un produit
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function () {
            resetForm();
            productForm.action = '/products_admin/add/';
            document.getElementById('modalTitle').textContent = "Ajouter un produit";
            productModal.classList.add('active');
        });
    }

    // ✏️ Gestion des boutons d'édition
    document.querySelectorAll('.edit-product').forEach(button => {
        button.addEventListener('click', function () {
            const productId = this.dataset.id;
            productForm.action = `/products_admin/edit/${productId}/`;
            document.getElementById('modalTitle').textContent = "Modifier le produit";

            // Convertir les images enregistrées en tableau
            const mediaData = this.dataset.media
                ? this.dataset.media.split(',').map(item => {
                    const [id, url] = item.split(':');
                    return { id: parseInt(id), url };
                })
                : [];

            // Remplir le formulaire avec les données existantes
            fillFormWithProductData({
                ...this.dataset,
                media: mediaData
            });

            // Ouvrir le modal
            productModal.classList.add('active');
        });
    });

    // ❌ Gestion des boutons de suppression
    document.querySelectorAll('.delete-product').forEach(button => {
        button.addEventListener('click', function () {
            const productId = this.dataset.id;
            document.getElementById('deleteProductId').value = productId;
            deleteProductModal.classList.add('active');
        });
    });

    // 🔄 Fermeture des modals
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // 🖼️ Gestion de l'upload d'images
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);

        // 🎯 Drag & Drop
        const dropZone = document.querySelector('.image-upload');
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });

            dropZone.addEventListener('drop', handleDrop, false);
        }
    }

    // 🗑️ Suppression des images existantes
    document.querySelectorAll('.remove-image[data-media-id]').forEach(button => {
        button.addEventListener('click', function () {
            const mediaId = this.dataset.mediaId;
            const previewItem = this.closest('.preview-item');

            if (confirm('Voulez-vous vraiment supprimer cette image ?')) {
                fetch(`/products_admin/image/delete/${mediaId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            previewItem.remove();
                        }
                    });
            }
        });
    });

    // 🎯 Gestion du tri dynamique (Recherche, Catégorie, Statut)
    const searchInput = document.querySelector('.search-box input[name="search"]');
    const categorySelect = document.querySelector('select[name="category"]');
    const statusSelect = document.querySelector('select[name="status"]');

    if (searchInput || categorySelect || statusSelect) {
        const filterForm = document.getElementById('filterForm');

        // Mise à jour dynamique du formulaire sur changement de filtre
        [categorySelect, statusSelect].forEach(select => {
            if (select) {
                select.addEventListener('change', function () {
                    filterForm.submit();
                });
            }
        });

        // Détection de la recherche avec un délai pour éviter les requêtes excessives
        let typingTimer;
        const typingDelay = 500;

        if (searchInput) {
            searchInput.addEventListener('keyup', function () {
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    filterForm.submit();
                }, typingDelay);
            });
        }
    }

    // 📌 Fonctions Utilitaires
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        e.currentTarget.classList.add('drag-hover');
    }

    function unhighlight(e) {
        e.currentTarget.classList.remove('drag-hover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleImageUpload(e) {
        handleFiles(this.files);
    }

    function handleFiles(files) {
        files = [...files];
        files.forEach(previewImage);
    }

    function previewImage(file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = createImagePreview(e.target.result);
                imagePreview.appendChild(preview);
            };
            reader.readAsDataURL(file);
        }
    }

    function createImagePreview(src) {
        const preview = document.createElement('div');
        preview.className = 'preview-item';
        preview.innerHTML = `
            <img src="${src}" alt="Preview">
            <button type="button" class="remove-image">×</button>
        `;

        preview.querySelector('.remove-image').addEventListener('click', function () {
            preview.remove();
        });

        return preview;
    }

    function fillFormWithProductData(data) {
        document.getElementById('productId').value = data.id;
        document.getElementById('productName').value = data.name;
        document.getElementById('productDescription').value = data.description;
        document.getElementById('productPrice').value = data.price;
        document.getElementById('productStock').value = data.stock;
        document.getElementById('productCategory').value = data.category;
        document.getElementById('productStatus').value = data.status;
        document.getElementById('productFeatured').checked = data.featured === 'true';

        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = '';

        if (data.media && data.media.length > 0) {
            data.media.forEach(media => {
                const preview = document.createElement('div');
                preview.className = 'preview-item';
                preview.innerHTML = `
                    <img src="${media.url}" alt="Preview">
                    <button type="button" class="remove-image" data-media-id="${media.id}">×</button>
                `;
                imagePreview.appendChild(preview);
            });
        }
    }

    function resetForm() {
        productForm.reset();
        imagePreview.innerHTML = '';
        document.getElementById('productId').value = '';
    }

    function closeModals() {
        productModal.classList.remove('active');
        deleteProductModal.classList.remove('active');
    }
});
