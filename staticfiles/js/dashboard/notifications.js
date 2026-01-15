// notifications.js - Script spécifique à la page des notifications

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM spécifiques à la page des notifications
    const filterTabs = document.querySelectorAll('.filter-tab');
    const searchForm = document.querySelector('.search-form');
    const timeFilterSelect = document.getElementById('timeFilter');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const notificationItems = document.querySelectorAll('.notification-item');
    const confirmModal = document.getElementById('confirmModal');
    
    // Initialisation
    initNotificationFilters();
    initNotificationActions();
    
    /**
     * Initialise les filtres de la page des notifications
     */
    function initNotificationFilters() {
        // Mise en surbrillance de l'onglet actif
        if (filterTabs) {
            filterTabs.forEach(tab => {
                tab.addEventListener('click', function(e) {
                    // Si ce n'est pas un lien normal
                    if (this.getAttribute('role') === 'button') {
                        e.preventDefault();
                        const filterValue = this.dataset.filter;
                        
                        // Mettre à jour visuellement les onglets
                        filterTabs.forEach(t => t.classList.remove('active'));
                        this.classList.add('active');
                        
                        // Filtrer les notifications
                        filterNotifications(filterValue);
                    }
                });
            });
        }
        
        // Soumission automatique du formulaire de recherche sur changement
        if (timeFilterSelect) {
            timeFilterSelect.addEventListener('change', function() {
                this.closest('form').submit();
            });
        }
    }
    
    /**
     * Initialise les actions sur les notifications (marquer comme lu, supprimer)
     */
    function initNotificationActions() {
        // Marquer une notification comme lue au clic
        notificationItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Ignorer si on clique sur un bouton d'action
                if (e.target.closest('.notification-action')) return;
                
                const notifId = this.dataset.id;
                markAsRead(notifId);
                
                // Rediriger vers la page de détails
                setTimeout(() => {
                    window.location.href = `/detail/${notifId}/`;
                }, 100);
            });
        });
        
        // Marquer toutes les notifications comme lues
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const csrfToken = document.querySelector('input[name=csrfmiddlewaretoken]');
                
                if (!csrfToken) {
                    console.error('CSRF token not found');
                    return;
                }
                
                fetch('/notifications/mark-all-read/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken.value,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Mettre à jour l'interface
                        document.querySelectorAll('.notification-item.unread').forEach(item => {
                            item.classList.remove('unread');
                            const dot = item.querySelector('.unread-dot');
                            if (dot) dot.remove();
                        });
                        
                        // Mettre à jour les compteurs
                        document.querySelectorAll('.count').forEach(count => {
                            if (count.closest('.filter-tab[data-filter="unread"]')) {
                                count.textContent = '0';
                            }
                        });
                        
                        // Afficher un message de confirmation
                        showToast('Toutes les notifications ont été marquées comme lues', 'success');
                    }
                })
                .catch(error => console.error('Erreur AJAX:', error));
            });
        }
        
        // Gestion des actions contextuelles
        document.querySelectorAll('.notification-menu-trigger').forEach(trigger => {
            trigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const dropdown = this.nextElementSibling;
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
        });
        
        // Fermer les menus contextuels lors du clic ailleurs
        document.addEventListener('click', function() {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        });
    }
    
    /**
     * Filtre les notifications selon le critère sélectionné
     * @param {string} filter - Le filtre à appliquer (all, unread, type)
     */
    function filterNotifications(filter) {
        notificationItems.forEach(item => {
            if (filter === 'all') {
                item.style.display = '';
            } else if (filter === 'unread') {
                item.style.display = item.classList.contains('unread') ? '' : 'none';
            } else {
                // Filtrer par type (si applicable)
                const itemType = item.dataset.type;
                item.style.display = itemType === filter ? '' : 'none';
            }
        });
        
        // Vérifier s'il faut afficher un message d'absence de résultats
        updateEmptyState();
    }
    
    /**
     * Met à jour l'affichage de l'état vide si aucune notification ne correspond au filtre
     */
    function updateEmptyState() {
        const visibleItems = document.querySelectorAll('.notification-item[style="display: "]');
        const emptyState = document.querySelector('.empty-state');
        
        if (visibleItems.length === 0) {
            if (!emptyState) {
                const empty = document.createElement('div');
                empty.className = 'empty-state';
                empty.innerHTML = `
                    <div class="empty-icon">
                        <i class="fas fa-bell-slash"></i>
                    </div>
                    <h3>Aucune notification</h3>
                    <p>Aucune notification ne correspond à vos critères</p>
                `;
                document.querySelector('.notifications-list').appendChild(empty);
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    }
    
    /**
     * Marque une notification comme lue
     * @param {string} id - L'ID de la notification
     */
    function markAsRead(id) {
        const notification = document.querySelector(`.notification-item[data-id="${id}"]`);
        if (!notification || !notification.classList.contains('unread')) return;
        
        const csrfToken = document.querySelector('input[name=csrfmiddlewaretoken]');
        if (!csrfToken) {
            console.error('CSRF token not found');
            return;
        }
        
        fetch(`/notifications/mark-read/${id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken.value,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                notification.classList.remove('unread');
                const dot = notification.querySelector('.unread-dot');
                if (dot) dot.remove();
                
                // Mettre à jour les compteurs
                const unreadCount = document.querySelectorAll('.notification-item.unread').length;
                document.querySelectorAll('.count').forEach(count => {
                    if (count.closest('.filter-tab[data-filter="unread"]')) {
                        count.textContent = unreadCount;
                    }
                });
            }
        })
        .catch(error => console.error('Erreur AJAX:', error));
    }

    /**
     * Affiche la modal de confirmation
     * @param {Function} callback - Fonction à exécuter si l'utilisateur confirme
     * @param {string} message - Message à afficher dans la modal
     */
    function showConfirmModal(callback, message = 'Êtes-vous sûr de vouloir effectuer cette action ?') {
        if (!confirmModal) return;
        
        const messageElement = confirmModal.querySelector('.modal-body p');
        if (messageElement) messageElement.textContent = message;
        
        confirmModal.style.display = 'block';
        
        const confirmBtn = confirmModal.querySelector('#confirmAction');
        if (confirmBtn) {
            // Supprimer les anciens écouteurs
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            // Ajouter le nouvel écouteur
            newConfirmBtn.addEventListener('click', function() {
                callback();
                confirmModal.style.display = 'none';
            });
        }
    }
});