document.addEventListener('DOMContentLoaded', function () {
    console.log("Le fichier customers.js est bien chargé");

    // Éléments du DOM
    const searchInput = document.querySelector('.search-box input');
    const statusFilter = document.querySelector('.filter-select');
    const customerModal = document.getElementById('customerModal');
    const closeModalBtn = document.querySelector('.close-modal');

    // Vérifie si les éléments existent avant d'ajouter des événements
    if (!searchInput || !statusFilter || !customerModal || !closeModalBtn) {
        console.error("Un ou plusieurs éléments DOM sont introuvables.");
        return;
    }

    // Fonction de recherche et filtrage
    function submitSearch() {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('search', searchInput.value);
        searchParams.set('status', statusFilter.value);
        window.location.href = `${window.location.pathname}?${searchParams.toString()}`;
    }

    // Ajout d'un debounce pour limiter les requêtes
    searchInput.addEventListener('input', debounce(submitSearch, 300));
    statusFilter.addEventListener('change', submitSearch);

    // Fonction pour afficher le modal avec les infos du client
    function openCustomerModal(button) {
        console.log("Ouverture du modal pour:", button.getAttribute('data-name'));

        document.getElementById('customerProfilePic').src = button.getAttribute('data-picture') || '/static/img/dashboard/default-avatar.png';
        document.getElementById('customerFullName').textContent = button.getAttribute('data-name');
        document.getElementById('customerEmail').textContent = button.getAttribute('data-email');
        document.getElementById('customerPhone').textContent = button.getAttribute('data-phone') || '-';
        document.getElementById('customerGender').textContent = button.getAttribute('data-gender') || '-';
        document.getElementById('customerBirthDate').textContent = button.getAttribute('data-birth') || '-';
        document.getElementById('customerOrders').textContent = button.getAttribute('data-orders');
        document.getElementById('customerSpent').textContent = `${button.getAttribute('data-spent')} €`;
        document.getElementById('customerLastOrder').textContent = button.getAttribute('data-lastorder') || 'Aucune commande';
        document.getElementById('customerJoinDate').textContent = button.getAttribute('data-joined');

        const statusBadge = document.getElementById('customerStatus');
        statusBadge.textContent = button.getAttribute('data-status');
        statusBadge.className = button.getAttribute('data-status') === "Actif" ? "status-badge active" : "status-badge blocked";

        // Afficher le modal
        customerModal.classList.add('active');
        console.log("Le modal est affiché");
    }

    // Ajout des événements sur les boutons "Voir le profil"
    document.querySelectorAll('.view-customer').forEach(button => {
        console.log("Bouton détecté:", button);
        button.addEventListener('click', function () {
            openCustomerModal(this);
        });
    });

    // Fermer le modal quand on clique sur la croix
    closeModalBtn.addEventListener('click', function () {
        console.log("Fermeture du modal");
        customerModal.classList.remove('active');
    });

    // Fermer le modal en cliquant en dehors
    window.addEventListener('click', function (event) {
        if (event.target === customerModal) {
            console.log("Fermeture du modal en cliquant à l'extérieur");
            customerModal.classList.remove('active');
        }
    });

    // Gestion du blocage/déblocage des clients via AJAX
    document.querySelectorAll('.toggle-status').forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();

            const customerId = this.getAttribute('data-id');
            const action = this.getAttribute('data-action');
            const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

            fetch('/customers/toggle-status/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ customer_id: customerId, action: action })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const statusBadge = document.querySelector(`#customer-status-${customerId}`);
                    const actionBtn = document.querySelector(`.toggle-status[data-id="${customerId}"]`);

                    if (data.new_status === "Actif") {
                        statusBadge.textContent = "Actif";
                        statusBadge.classList.remove("blocked");
                        statusBadge.classList.add("active");
                        actionBtn.innerHTML = '<i class="fas fa-ban"></i>';
                        actionBtn.setAttribute('data-action', 'block');
                        actionBtn.setAttribute('title', 'Bloquer');
                    } else {
                        statusBadge.textContent = "Bloqué";
                        statusBadge.classList.remove("active");
                        statusBadge.classList.add("blocked");
                        actionBtn.innerHTML = '<i class="fas fa-unlock"></i>';
                        actionBtn.setAttribute('data-action', 'unblock');
                        actionBtn.setAttribute('title', 'Débloquer');
                    }
                } else {
                    alert('Erreur : ' + data.error);
                }
            })
            .catch(error => console.error('Erreur AJAX:', error));
        });
    });

    // Fonction debounce pour éviter trop de requêtes inutiles
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Gestion des messages d'alerte (disparition automatique après 3 secondes)
    function initializeAlerts() {
        const alerts = document.querySelectorAll('.alert');
        if (alerts.length > 0) {
            alerts.forEach(alert => {
                setTimeout(() => {
                    alert.style.opacity = '0';
                    setTimeout(() => {
                        alert.remove();
                    }, 300);
                }, 3000);
            });
        }
    }

    // Initialisation des alertes
    initializeAlerts();
});
