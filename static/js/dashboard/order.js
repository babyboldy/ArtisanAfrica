// order.js - Gestion des commandes du dashboard

document.addEventListener('DOMContentLoaded', function () {
    // Configuration globale
    const config = {
        rowsPerPage: 10,
        debounceDelay: 300,
        notificationDuration: 3000,
        monthMap: {
            'janv': 0, 'févr': 1, 'mars': 2, 'avr': 3, 'mai': 4,
            'juin': 5, 'juil': 6, 'août': 7, 'sept': 8, 'oct': 9,
            'nov': 10, 'déc': 11
        }
    };

    // Éléments DOM
    const elements = {
        selectAll: document.getElementById('selectAll'),
        orderCheckboxes: document.querySelectorAll('.order-select'),
        batchActions: document.querySelector('.batch-actions'),
        selectedCount: document.querySelector('.selected-count'),
        statusFilter: document.getElementById('statusFilter'),
        dateFilter: document.getElementById('dateFilter'),
        searchOrder: document.getElementById('searchOrder'),
        orderDetailModal: document.getElementById('orderDetailModal'),
        batchUpdateModal: document.getElementById('batchUpdateModal'),
        batchUpdateButton: document.getElementById('batchUpdate'),
        confirmBatchUpdateButton: document.getElementById('confirmBatchUpdate'),
        exportOrdersBtn: document.getElementById('exportOrders'),
        batchExportBtn: document.getElementById('batchExport'),
        modals: document.querySelectorAll('.modal'),
        closeModalBtns: document.querySelectorAll('.close-modal')
    };

    // Initialisation
    initCheckboxes();
    initFilters();
    initModals();
    initActionButtons();
    updatePagination();
    
    // Système de sélection des commandes
    function initCheckboxes() {
        if (elements.selectAll) {
            elements.selectAll.addEventListener('change', function (e) {
                elements.orderCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
                updateBatchActionsVisibility();
            });
        }

        elements.orderCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                updateSelectAllState();
                updateBatchActionsVisibility();
            });
        });
    }

    function updateSelectAllState() {
        if (!elements.selectAll) return;
        
        const allChecked = Array.from(elements.orderCheckboxes).every(c => c.checked);
        const someChecked = Array.from(elements.orderCheckboxes).some(c => c.checked);
        
        elements.selectAll.checked = allChecked;
        elements.selectAll.indeterminate = someChecked && !allChecked;
    }

    function updateBatchActionsVisibility() {
        if (!elements.batchActions || !elements.selectedCount) return;
        
        const checkedCount = document.querySelectorAll('.order-select:checked').length;
        elements.batchActions.style.display = checkedCount > 0 ? 'flex' : 'none';
        elements.selectedCount.textContent = `${checkedCount} sélectionné(s)`;
    }

    // Système de filtrage des commandes
    function initFilters() {
        if (!elements.statusFilter && !elements.dateFilter && !elements.searchOrder) return;

        // Appliquer les filtres sur changement
        if (elements.statusFilter) {
            elements.statusFilter.addEventListener('change', applyFilters);
        }
        
        if (elements.dateFilter) {
            elements.dateFilter.addEventListener('change', applyFilters);
        }
        
        if (elements.searchOrder) {
            elements.searchOrder.addEventListener('input', debounce(applyFilters, config.debounceDelay));
        }
    }

    function applyFilters() {
        const filters = {
            status: elements.statusFilter?.value.toLowerCase() || '',
            date: elements.dateFilter?.value.toLowerCase() || '',
            search: elements.searchOrder?.value.toLowerCase() || ''
        };

        let visibleCount = 0;
        
        document.querySelectorAll('.orders-table tbody tr').forEach(row => {
            // Ignorer la ligne d'état vide si elle existe
            if (row.classList.contains('empty-state')) return;
            
            const statusCell = row.querySelector('.status-badge');
            const dateCell = row.querySelector('td:nth-child(4) span:first-child');
            const orderIdCell = row.querySelector('.order-id');
            const customerCell = row.querySelector('.customer-info h4');

            // Vérifier si la ligne correspond aux critères
            const matchesStatus = !filters.status || 
                (statusCell?.textContent.toLowerCase() || '').includes(filters.status);
            
            const matchesDate = !filters.date || 
                (dateCell && filterByDate(dateCell, filters.date));
            
            const matchesSearch = !filters.search || 
                (orderIdCell?.textContent.toLowerCase() || '').includes(filters.search) || 
                (customerCell?.textContent.toLowerCase() || '').includes(filters.search);

            // Afficher ou masquer la ligne
            const isVisible = matchesStatus && matchesDate && matchesSearch;
            row.style.display = isVisible ? '' : 'none';
            
            if (isVisible) visibleCount++;
        });

        // Afficher un message si aucun résultat
        updateEmptyState(visibleCount === 0);
        
        // Mettre à jour la pagination
        updatePagination();
    }

    function filterByDate(dateCell, filterValue) {
        const dateText = dateCell.textContent.trim();
        const rowDate = parseFrenchDate(dateText);
        if (!rowDate) return true; // Si la date ne peut pas être analysée, on l'inclut
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (filterValue) {
            case 'today':
                return rowDate.toDateString() === today.toDateString();
                
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                return rowDate >= weekAgo;
                
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return rowDate >= monthStart;
                
            case 'custom':
                // Implémentation ultérieure pour date personnalisée
                return true;
                
            default:
                return true;
        }
    }

    function parseFrenchDate(dateStr) {
        // Format attendu: "10 Fév 2024" ou similaire
        const parts = dateStr.split(' ');
        if (parts.length < 3) return null;
        
        const day = parseInt(parts[0]);
        const monthStr = parts[1].toLowerCase();
        const year = parseInt(parts[2]);
        
        // Trouver le mois dans le mapping
        let month = null;
        for (const [key, value] of Object.entries(config.monthMap)) {
            if (monthStr.startsWith(key)) {
                month = value;
                break;
            }
        }
        
        return month !== null ? new Date(year, month, day) : null;
    }

    function updateEmptyState(isEmpty) {
        const tbody = document.querySelector('.orders-table tbody');
        if (!tbody) return;
        
        let emptyState = tbody.querySelector('.empty-state');
        
        if (isEmpty) {
            if (!emptyState) {
                emptyState = document.createElement('tr');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <td colspan="8">
                        <div class="empty-state-content">
                            <i class="fas fa-search"></i>
                            <p>Aucune commande ne correspond à vos critères</p>
                            <button class="btn btn-outline btn-sm" id="resetFiltersBtn">
                                <i class="fas fa-undo"></i> Réinitialiser les filtres
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(emptyState);
                
                // Ajouter l'événement pour réinitialiser les filtres
                const resetBtn = document.getElementById('resetFiltersBtn');
                if (resetBtn) {
                    resetBtn.addEventListener('click', resetFilters);
                }
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    }

    // Gestion des modals et actions
    function initModals() {
        // Ouvrir le modal de détails
        document.querySelectorAll('.action-btn[title="Voir"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const orderId = this.closest('tr').querySelector('.order-id')?.textContent;
                openOrderDetailModal(orderId);
            });
        });

        // Ouvrir le modal de mise à jour groupée
        if (elements.batchUpdateButton && elements.batchUpdateModal) {
            elements.batchUpdateButton.addEventListener('click', function() {
                const selectedOrders = getSelectedOrders();
                if (selectedOrders.length === 0) {
                    showToast('Veuillez sélectionner au moins une commande', 'warning');
                    return;
                }
                
                openModal(elements.batchUpdateModal);
            });
        }

        // Confirmer la mise à jour groupée
        if (elements.confirmBatchUpdateButton) {
            elements.confirmBatchUpdateButton.addEventListener('click', handleBatchUpdate);
        }

        // Fermer les modals
        elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) closeModal(modal);
            });
        });

        // Fermer les modals en cliquant en dehors
        elements.modals.forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(this);
            });
        });
        
        // Fermer les modals avec Echap
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                elements.modals.forEach(modal => {
                    if (modal.classList.contains('active')) {
                        closeModal(modal);
                    }
                });
            }
        });
    }

    function initActionButtons() {
        // Bouton d'export de commandes
        if (elements.exportOrdersBtn) {
            elements.exportOrdersBtn.addEventListener('click', () => showExportModal());
        }

        // Bouton d'export des commandes sélectionnées
        if (elements.batchExportBtn) {
            elements.batchExportBtn.addEventListener('click', () => {
                const selectedIds = getSelectedOrders();
                if (selectedIds.length === 0) {
                    showToast('Veuillez sélectionner au moins une commande', 'warning');
                    return;
                }
                showExportModal(selectedIds);
            });
        }

        // Boutons d'actions sur chaque ligne
        document.querySelectorAll('.table-actions .action-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.getAttribute('title') === 'Voir') return; // Déjà géré ailleurs
                
                const action = this.getAttribute('title')?.toLowerCase();
                const row = this.closest('tr');
                const orderId = row.querySelector('.order-id')?.textContent;
                
                if (!action || !orderId) return;
                
                switch (action) {
                    case 'modifier':
                        // Rediriger vers la page d'édition ou ouvrir un modal
                        showToast(`Modification de la commande ${orderId}`, 'info');
                        break;
                        
                    case 'supprimer':
                        if (confirm(`Voulez-vous vraiment supprimer la commande ${orderId} ?`)) {
                            // Appel AJAX pour supprimer la commande
                            showToast(`Suppression de la commande ${orderId}`, 'success');
                            row.remove();
                        }
                        break;
                        
                    default:
                        // Actions supplémentaires
                        showToast(`Action ${action} sur la commande ${orderId}`, 'info');
                        break;
                }
            });
        });
    }

    // Fonctions pour les modals
    function openOrderDetailModal(orderId) {
        if (!elements.orderDetailModal) return;

        // Mise à jour du titre
        const modalTitle = elements.orderDetailModal.querySelector('.modal-header h2');
        if (modalTitle) modalTitle.textContent = `Détails de la commande ${orderId}`;

        // Ici, on pourrait charger les détails de la commande via AJAX
        // Pour l'instant, on utilise les données statiques déjà dans le modal
        
        openModal(elements.orderDetailModal);
    }

    function openModal(modal) {
        if (!modal) return;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Gestion de l'export
    function showExportModal(selectedIds = null) {
        // Créer dynamiquement la modal d'export
        const modal = document.createElement('div');
        modal.className = 'modal export-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${selectedIds ? 'Exporter les commandes sélectionnées' : 'Exporter toutes les commandes'}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <button class="btn btn-outline" data-format="excel">
                            <i class="fas fa-file-excel"></i>
                            <span>Excel</span>
                            <small>Format tableur complet</small>
                        </button>
                        <button class="btn btn-outline" data-format="pdf">
                            <i class="fas fa-file-pdf"></i>
                            <span>PDF</span>
                            <small>Document formaté</small>
                        </button>
                        <button class="btn btn-outline" data-format="csv">
                            <i class="fas fa-file-csv"></i>
                            <span>CSV</span>
                            <small>Données brutes</small>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';

        // Fermeture de la modal
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                document.body.style.overflow = '';
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                document.body.style.overflow = '';
            }
        });

        // Gestion de l'export
        modal.querySelectorAll('.export-options button').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                exportOrders(format, selectedIds);
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
                document.body.style.overflow = '';
            });
        });
    }

    function exportOrders(format, selectedIds = null) {
        showToast(`Export des commandes en ${format.toUpperCase()} en cours...`, 'info');

        // Simulation d'export (à remplacer par un vrai appel AJAX)
        setTimeout(() => {
            showToast(`${selectedIds ? selectedIds.length : 'Toutes les'} commandes exportées avec succès`, 'success');
        }, 1500);
    }

    // Gestion des mises à jour groupées
    function handleBatchUpdate() {
        const selectedOrders = getSelectedOrders();
        const batchStatus = document.getElementById('batchStatus')?.value;
        const batchNote = document.getElementById('batchNote')?.value;

        if (!batchStatus) {
            showToast('Veuillez sélectionner un statut', 'warning');
            return;
        }

        showToast('Mise à jour en cours...', 'info');

        // Simulation de mise à jour (à remplacer par un vrai appel AJAX)
        setTimeout(() => {
            // Mettre à jour l'interface
            document.querySelectorAll('.order-select:checked').forEach(checkbox => {
                const row = checkbox.closest('tr');
                const statusBadge = row.querySelector('.status-badge');
                
                if (statusBadge) {
                    statusBadge.textContent = getStatusDisplayName(batchStatus);
                    statusBadge.className = `status-badge ${batchStatus}`;
                }
                
                // Décocher la case
                checkbox.checked = false;
            });
            
            // Réinitialiser l'interface
            if (elements.selectAll) elements.selectAll.checked = false;
            if (elements.batchUpdateModal) closeModal(elements.batchUpdateModal);
            updateBatchActionsVisibility();
            
            showToast('Commandes mises à jour avec succès', 'success');
        }, 1500);
    }

    // Pagination
    function updatePagination() {
        // À implémenter selon votre structure HTML
        // Cette fonction doit gérer la pagination en fonction des lignes visibles
    }

    // Utilitaires
    function resetFilters() {
        if (elements.statusFilter) elements.statusFilter.value = '';
        if (elements.dateFilter) elements.dateFilter.value = 'today';
        if (elements.searchOrder) elements.searchOrder.value = '';
        
        applyFilters();
        showToast('Filtres réinitialisés', 'info');
    }

    function getSelectedOrders() {
        return Array.from(document.querySelectorAll('.order-select:checked'))
            .map(checkbox => {
                const orderId = checkbox.closest('tr').querySelector('.order-id')?.textContent;
                return orderId ? orderId.replace('#', '') : null;
            })
            .filter(Boolean);
    }

    function getStatusDisplayName(status) {
        const statusMap = {
            'pending': 'En attente',
            'processing': 'En cours',
            'shipped': 'Expédiée',
            'delivered': 'Livrée',
            'cancelled': 'Annulée'
        };
        
        return statusMap[status] || status;
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});