document.addEventListener('DOMContentLoaded', function () {
    console.log("Le fichier dashboard.js est bien chargé");

    // Éléments du DOM
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const menuTrigger = document.querySelector('.menu-trigger');
    const notificationCenter = document.querySelector('.notification-center');
    const notificationBadge = document.getElementById('notification-badge');
    const markAllReadBtn = document.getElementById('mark-all-read');
    const profileMenu = document.querySelector('.profile-menu');
    const logoutBtns = document.querySelectorAll('.logout-btn');

    /** ========== 1️⃣ GESTION DE LA BARRE LATÉRALE ========== */
    function initSidebar() {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        // Basculer la sidebar
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.style.marginLeft = sidebar.classList.contains('collapsed') ? '70px' : '260px';
            localStorage.setItem('sidebarState', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
        });

        // Menu mobile
        menuTrigger.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });

        // Fermer la sidebar en cliquant en dehors
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });

        // Restaurer l'état de la sidebar
        if (localStorage.getItem('sidebarState') === 'collapsed') {
            sidebar.classList.add('collapsed');
            mainContent.style.marginLeft = '70px';
        }
    }

    /** ========== 2️⃣ GESTION DES NOTIFICATIONS ========== */
    function initNotifications() {
        const trigger = notificationCenter.querySelector('.notification-trigger');
        const dropdown = notificationCenter.querySelector('.notification-dropdown');
        const notificationList = dropdown.querySelector('.notification-list');

        // Fonction pour récupérer les notifications non lues
        function fetchNotifications() {
            fetch('/notifications/unread/')
                .then(response => response.json())
                .then(data => {
                    notificationList.innerHTML = '';

                    if (data.notifications.length > 0) {
                        data.notifications.forEach(notification => {
                            const item = document.createElement('div');
                            item.classList.add('notification-item', notification.is_read ? 'read' : 'unread');
                            item.innerHTML = `
                                <i class="fas ${notification.icon}"></i>
                                <div class="notification-content">
                                    <p>${notification.title}</p>
                                    <span>${notification.created_at}</span>
                                </div>
                                ${!notification.is_read ? '<div class="unread-dot"></div>' : ''}
                            `;
                            notificationList.appendChild(item);
                        });
                        notificationBadge.textContent = data.unread_count;
                        notificationBadge.style.display = data.unread_count > 0 ? 'flex' : 'none';
                    } else {
                        notificationList.innerHTML = '<p class="no-notifications">Aucune nouvelle notification</p>';
                        notificationBadge.style.display = 'none';
                    }
                })
                .catch(error => console.error('Erreur AJAX:', error));
        }

        // Ouvrir/Fermer la liste des notifications
        trigger.addEventListener('click', () => {
            notificationCenter.classList.toggle('active');
            fetchNotifications();
        });

        // Marquer toutes les notifications comme lues
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', function () {
                fetch('/notifications/mark-all-read/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            notificationBadge.textContent = '';
                            notificationBadge.style.display = 'none';
                            fetchNotifications(); // Rafraîchir les notifications
                        }
                    })
                    .catch(error => console.error('Erreur AJAX:', error));
            });
        }

        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!notificationCenter.contains(e.target)) {
                notificationCenter.classList.remove('active');
            }
        });

        fetchNotifications();
    }

    /** ========== 3️⃣ GESTION DU MENU PROFIL ========== */
    function initProfileMenu() {
        const trigger = profileMenu.querySelector('.profile-trigger');
        trigger.addEventListener('click', () => {
            profileMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target)) {
                profileMenu.classList.remove('active');
            }
        });
    }

    /** ========== 4️⃣ GESTION DES ALERTES (Toasts) ========== */
    // function showToast(message, type = 'success') {
    //     const toast = document.createElement('div');
    //     toast.className = `toast ${type}`;
    //     toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    //                        <span>${message}</span>`;

    //     const container = document.querySelector('.toast-container') || (() => {
    //         const c = document.createElement('div');
    //         c.className = 'toast-container';
    //         document.body.appendChild(c);
    //         return c;
    //     })();

    //     container.appendChild(toast);

    //     setTimeout(() => {
    //         toast.remove();
    //         if (container.children.length === 0) {
    //             container.remove();
    //         }
    //     }, 3000);
    // }

    // Convertir les messages Django en toasts
    function initializeAlerts() {
        const alertElements = document.querySelectorAll('.alert');
        alertElements.forEach(alert => {
            const message = alert.textContent.trim();
            const type = alert.classList.contains('alert-success') ? 'success' :
                alert.classList.contains('alert-danger') ? 'error' :
                    alert.classList.contains('alert-warning') ? 'warning' : 'info';

            showToast(message, type);
        });
    }

    /** ========== 5️⃣ GESTION DU MENU ACTIF ========== */
    function highlightActiveMenu() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-menu a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.closest('.nav-item').classList.add('active');
            }
        });
    }

    /** ========== 6️⃣ GESTION DE LA DÉCONNEXION ========== */
    function initLogout() {
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Déconnexion clicked');
            });
        });
    }

    /** ========== 7️⃣ INITIALISATION GLOBALE ========== */
    initSidebar();
    initNotifications();
    initProfileMenu();
    initializeAlerts();
    highlightActiveMenu();
    initLogout();

    // Gestion du loader de page
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
    });
});
