// customers.js - Gestion des clients du dashboard

document.addEventListener('DOMContentLoaded', function () {
    console.log("Le fichier customers.js est bien chargé");

    // Éléments du DOM
    const searchInput = document.querySelector('.search-box input');
    const statusFilter = document.querySelector('.filter-select');
    const customerModal = document.getElementById('customerModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const viewCustomerBtns = document.querySelectorAll('.view-customer');
    const toggleStatusBtns = document.querySelectorAll('.toggle-status');

    // Initialisation
    initSearch();
    initCustomerDetails();
    initStatusToggle();
    initAlerts();

    // Gestion de la recherche et filtrage
    function initSearch() {
        if (!searchInput || !statusFilter) return;

        function submitSearch() {
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set('search', searchInput.value.trim());
            searchParams.set('status', statusFilter.value);
            window.location.href = `${window.location.pathname}?${searchParams.toString()}`;
        }

        // Recherche avec debounce pour limiter les requêtes
        searchInput.addEventListener('input', debounce(function() {
            if (this.value.trim().length >= 2 || this.value.trim().length === 0) {
                submitSearch();
            }
        }, 500));

        // Filtrage par statut
        statusFilter.addEventListener('change', submitSearch);
    }

    // Affichage des détails client
    function initCustomerDetails() {
        if (!customerModal || !closeModalBtn) return;

        // Afficher le modal avec les détails du client
        viewCustomerBtns.forEach(button => {
            button.addEventListener('click', function () {
                openCustomerModal(this);
            });
        });

        // Fermer le modal
        closeModalBtn.addEventListener('click', function () {
            customerModal.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Fermer en cliquant en dehors
        window.addEventListener('click', function (event) {
            if (event.target === customerModal) {
                customerModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Fermer avec Echap
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && customerModal.classList.contains('active')) {
                customerModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Fonction pour afficher le modal client
    function openCustomerModal(button) {
        if (!customerModal) return;

        // Récupérer les données du client
        const customerData = button.dataset;
        
        // Remplir le modal avec les données
        document.getElementById('customerProfilePic').src = customerData.picture || '/static/img/dashboard/default-avatar.png';
        document.getElementById('customerFullName').textContent = customerData.name;
        document.getElementById('customerEmail').textContent = customerData.email;
        document.getElementById('customerPhone').textContent = customerData.phone || '-';
        document.getElementById('customerGender').textContent = customerData.gender || '-';
        document.getElementById('customerBirthDate').textContent = customerData.birth || '-';
        document.getElementById('customerOrders').textContent = customerData.orders;
        document.getElementById('customerSpent').textContent = `${customerData.spent} F CFA`;
        document.getElementById('customerLastOrder').textContent = customerData.lastorder || 'Aucune commande';
        document.getElementById('customerJoinDate').textContent = customerData.joined;

        const statusBadge = document.getElementById('customerStatus');
        statusBadge.textContent = customerData.status;
        statusBadge.className = `status-badge ${customerData.status === "Actif" ? "active" : "blocked"}`;

        // Afficher le modal
        customerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Gestion du statut des clients (actif/bloqué)
    function initStatusToggle() {
        if (!toggleStatusBtns.length) return;

        toggleStatusBtns.forEach(button => {
            button.addEventListener('click', function (event) {
                event.preventDefault();

                const customerId = this.dataset.id;
                const action = this.dataset.action;
                const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value;

                if (!csrfToken) {
                    console.error('CSRF token not found');
                    return;
                }

                // Mise à jour du statut via AJAX
                fetch('/customers/toggle-status/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify({ customer_id: customerId, action: action })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Erreur réseau');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        updateCustomerStatus(customerId, data.new_status, action === 'block' ? 'unblock' : 'block');
                        showToast(`Client ${data.new_status === "Actif" ? "activé" : "bloqué"} avec succès`, 'success');
                    } else {
                        showToast('Erreur : ' + (data.error || 'Une erreur est survenue'), 'error');
                    }
                })
                .catch(error => {
                    console.error('Erreur AJAX:', error);
                    showToast('Erreur de connexion au serveur', 'error');
                });
            });
        });
    }

    // Mise à jour visuelle du statut du client
    function updateCustomerStatus(customerId, newStatus, newAction) {
        // Mise à jour du badge de statut
        const statusBadge = document.querySelector(`#customer-status-${customerId}`);
        if (statusBadge) {
            statusBadge.textContent = newStatus;
            statusBadge.className = `status-badge ${newStatus === "Actif" ? "active" : "blocked"}`;
        }

        // Mise à jour du bouton d'action
        const actionBtn = document.querySelector(`.toggle-status[data-id="${customerId}"]`);
        if (actionBtn) {
            actionBtn.innerHTML = newAction === 'block' 
                ? '<i class="fas fa-ban"></i>' 
                : '<i class="fas fa-unlock"></i>';
            actionBtn.setAttribute('data-action', newAction);
            actionBtn.setAttribute('title', newAction === 'block' ? 'Bloquer' : 'Débloquer');
        }
    }

    // Gestion des alertes
    function initAlerts() {
        const alerts = document.querySelectorAll('.alert');
        if (alerts.length > 0) {
            alerts.forEach(alert => {
                // Auto-disparition après 3 secondes
                setTimeout(() => {
                    alert.style.opacity = '0';
                    setTimeout(() => {
                        alert.remove();
                    }, 300);
                }, 3000);
            });
        }
    }

    // Utilitaire: Function debounce
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});