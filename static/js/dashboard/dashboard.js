// dashboard.js - Script principal commun à toutes les pages du dashboard

document.addEventListener('DOMContentLoaded', function () {
    console.log("Le fichier dashboard.js est bien chargé");

    // Éléments du DOM
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const menuTrigger = document.querySelector('.menu-trigger');
    const notificationCenter = document.querySelector('.notification-center');
    const notificationTrigger = notificationCenter?.querySelector('.notification-trigger');
    const notificationDropdown = notificationCenter?.querySelector('.notification-dropdown');
    const markAllReadBtn = document.getElementById('mark-all-read');
    const profileMenu = document.querySelector('.profile-menu');
    const profileTrigger = profileMenu?.querySelector('.profile-trigger');
    const logoutBtns = document.querySelectorAll('.logout-btn');

    /** ========== 1️⃣ GESTION DE LA BARRE LATÉRALE ========== */
    function initSidebar() {
        if (!sidebar || !mainContent) return;

        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        // Basculer la sidebar
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.style.marginLeft = sidebar.classList.contains('collapsed') ? '70px' : '260px';
                localStorage.setItem('sidebarState', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
            });
        }

        // Menu mobile
        if (menuTrigger) {
            menuTrigger.addEventListener('click', () => {
                sidebar.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden'; // Empêche le défilement
            });
        }

        // Fermer la sidebar en cliquant en dehors
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = ''; // Permet à nouveau le défilement
        });

        // Restaurer l'état de la sidebar
        if (localStorage.getItem('sidebarState') === 'collapsed') {
            sidebar.classList.add('collapsed');
            mainContent.style.marginLeft = '70px';
        }
    }

    /** ========== 2️⃣ GESTION DES NOTIFICATIONS ========== */
    function initNotifications() {
        if (!notificationCenter) return;

        const notificationBadge = document.getElementById('notification-badge');
        const notificationList = notificationDropdown?.querySelector('.notification-list');

        // Fonction pour récupérer les notifications non lues
        function fetchNotifications() {
            // Utiliser l'API Fetch pour obtenir les notifications depuis le serveur
            fetch('/notifications/unread/')
                .then(response => response.json())
                .then(data => {
                    if (!notificationList) return;
                    notificationList.innerHTML = '';

                    if (data.notifications && data.notifications.length > 0) {
                        // Créer les éléments de notification
                        data.notifications.forEach(notification => {
                            const item = document.createElement('div');
                            item.classList.add('notification-item', notification.is_read ? '' : 'unread');
                            item.dataset.id = notification.id;
                            
                            item.innerHTML = `
                                <i class="fas ${notification.icon || 'fa-bell'}"></i>
                                <div class="notification-content">
                                    <p>${notification.title}</p>
                                    <span>${notification.created_at}</span>
                                </div>
                                ${!notification.is_read ? '<div class="unread-dot" data-id="' + notification.id + '"></div>' : ''}
                            `;
                            
                            // Ajouter un gestionnaire d'événements pour le clic
                            item.addEventListener('click', function() {
                                window.location.href = `/notifications/detail/${notification.id}/`;
                            });
                            
                            notificationList.appendChild(item);
                        });
                        
                        // Mettre à jour le badge
                        if (notificationBadge) {
                            notificationBadge.textContent = data.unread_count;
                            notificationBadge.style.display = data.unread_count > 0 ? 'flex' : 'none';
                        }
                    } else {
                        notificationList.innerHTML = '<p class="no-notifications">Aucune nouvelle notification</p>';
                        if (notificationBadge) {
                            notificationBadge.style.display = 'none';
                        }
                    }
                })
                .catch(error => console.error('Erreur lors du chargement des notifications:', error));
        }

        // Ouvrir/Fermer la liste des notifications
        if (notificationTrigger) {
            notificationTrigger.addEventListener('click', () => {
                notificationCenter.classList.toggle('active');
                if (notificationCenter.classList.contains('active')) {
                    fetchNotifications();
                }
            });
        }

        // Marquer toutes les notifications comme lues
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', function (e) {
                e.preventDefault();
                const csrfToken = document.querySelector('input[name=csrfmiddlewaretoken]')?.value;
                
                if (!csrfToken) {
                    console.error('CSRF token not found');
                    return;
                }
                
                fetch('/notifications/mark-all-read/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (notificationBadge) {
                            notificationBadge.textContent = '0';
                            notificationBadge.style.display = 'none';
                        }
                        fetchNotifications();
                        showToast('Toutes les notifications ont été marquées comme lues', 'success');
                    }
                })
                .catch(error => console.error('Erreur AJAX:', error));
            });
        }

        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (notificationCenter && !notificationCenter.contains(e.target)) {
                notificationCenter.classList.remove('active');
            }
        });

        // Charger les notifications au démarrage
        fetchNotifications();
        
        // Charger les notifications périodiquement (toutes les 2 minutes)
        setInterval(fetchNotifications, 120000);
    }

    /** ========== 3️⃣ GESTION DU MENU PROFIL ========== */
    function initProfileMenu() {
        if (!profileMenu || !profileTrigger) return;

        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target)) {
                profileMenu.classList.remove('active');
            }
        });
    }

    /** ========== 4️⃣ GESTION DES ALERTES ET TOASTS ========== */
    function initAlerts() {
        // Convertir les messages Django en toasts
        const alertElements = document.querySelectorAll('.alert');
        if (alertElements.length) {
            alertElements.forEach(alert => {
                const message = alert.textContent.trim();
                const type = alert.classList.contains('alert-success') ? 'success' :
                    alert.classList.contains('alert-danger') || alert.classList.contains('alert-error') ? 'error' :
                    alert.classList.contains('alert-warning') ? 'warning' : 'info';

                showToast(message, type);
                
                // Optionnel : supprimer les alertes après les avoir converties en toasts
                // alert.remove();
            });
        }
    }

    /** ========== 5️⃣ GESTION DU MENU ACTIF ========== */
    function highlightActiveMenu() {
        const currentPath = window.location.pathname;
        
        document.querySelectorAll('.nav-menu a').forEach(link => {
            const linkPath = link.getAttribute('href');
            
            // Normaliser les URLs pour ignorer les barres obliques finales
            const normalizedCurrentPath = currentPath.replace(/\/$/, '');
            const normalizedLinkPath = linkPath?.replace(/\/$/, '');
            
            if (normalizedLinkPath && (
                normalizedCurrentPath === normalizedLinkPath || 
                normalizedCurrentPath.startsWith(normalizedLinkPath + '/')
            )) {
                link.closest('.nav-item')?.classList.add('active');
            }
        });
    }

    /** ========== 6️⃣ GESTION DES MODALS ========== */
    function initModals() {
        // Gestionnaire pour tous les boutons de fermeture de modal
        document.querySelectorAll('.close-modal, .close-modal2').forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = ''; // Permettre le défilement à nouveau
                }
            });
        });

        // Fermer en cliquant sur l'overlay
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    /** ========== 7️⃣ INITIALISATION GLOBALE ========== */
    initSidebar();
    initNotifications();
    initProfileMenu();
    initAlerts();
    highlightActiveMenu();
    initModals();

    // Événements globaux
    document.addEventListener('keydown', function(e) {
        // Fermer les modals avec ESC
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });
});

/**
 * Affiche un toast de notification
 * @param {string} message - Le message à afficher
 * @param {string} type - Le type de toast (success, error, warning, info)
 */
function showToast(message, type = 'success') {
    // Créer le toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Déterminer l'icône en fonction du type
    let icon;
    switch (type) {
        case 'success': icon = 'fa-check-circle'; break;
        case 'error': icon = 'fa-times-circle'; break;
        case 'warning': icon = 'fa-exclamation-triangle'; break;
        default: icon = 'fa-info-circle';
    }
    
    // Définir le contenu du toast
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    
    // Créer le conteneur de toasts s'il n'existe pas déjà
    const container = document.querySelector('.toast-container') || (() => {
        const c = document.createElement('div');
        c.className = 'toast-container';
        document.body.appendChild(c);
        return c;
    })();
    
    // Ajouter le toast au conteneur
    container.appendChild(toast);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    
    // Auto-suppression après 3 secondes
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        
        // Supprimer l'élément après la fin de l'animation
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}