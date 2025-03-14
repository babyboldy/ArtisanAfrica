document.addEventListener('DOMContentLoaded', function () {
    // ==========================
    // 1. Configuration Globale
    // ==========================
    const config = {
        rowsPerPage: 10,
        debounceDelay: 300,
        monthMap: {
            'janv': 0, 'févr': 1, 'mars': 2, 'avr': 3, 'mai': 4,
            'juin': 5, 'juil': 6, 'août': 7, 'sept': 8, 'oct': 9,
            'nov': 10, 'déc': 11
        },
        notificationDuration: 3000
    };

    // ==========================
    // 2. Système de Notifications
    // ==========================
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' :
                type === 'error' ? 'times-circle' :
                    type === 'warning' ? 'exclamation-triangle' :
                        'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="close-notification">&times;</button>
        `;

        document.body.appendChild(notification);

        // Animation d'entrée
        requestAnimationFrame(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        });

        // Fermeture automatique
        const timeout = setTimeout(() => {
            closeNotification(notification);
        }, config.notificationDuration);

        // Bouton de fermeture
        notification.querySelector('.close-notification').addEventListener('click', () => {
            clearTimeout(timeout);
            closeNotification(notification);
        });
    }

    function closeNotification(notification) {
        notification.style.transform = 'translateY(-100%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }

    // ==========================
    // 3. Système d'Export
    // ==========================
    async function exportOrders(format, selectedIds = null) {
        try {
            showNotification('Export en cours...', 'info');

            let url = `/dashboard/orders/export/?format=${format}`;
            if (selectedIds && selectedIds.length > 0) {
                url += `&ids=${selectedIds.join(',')}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const filename = `commandes_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            showNotification('Export réussi !', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            showNotification('Erreur lors de l\'export', 'error');
        }
    }

    function showExportModal(selectedIds = null) {
        const modal = document.createElement('div');
        modal.className = 'modal export-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Exporter les commandes</h2>
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

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        modal.querySelectorAll('.export-options button').forEach(btn => {
            btn.addEventListener('click', () => {
                exportOrders(btn.dataset.format, selectedIds);
                modal.remove();
            });
        });
    }

    // ==========================
    // 4. Sélection et Actions Groupées
    // ==========================
    const selectAll = document.getElementById('selectAll');
    const orderCheckboxes = document.querySelectorAll('.order-select');
    const batchActions = document.querySelector('.batch-actions');
    const selectedCount = document.querySelector('.selected-count');

    function updateBatchActionsVisibility() {
        const checkedCount = document.querySelectorAll('.order-select:checked').length;
        if (batchActions) {
            batchActions.style.display = checkedCount > 0 ? 'flex' : 'none';
            selectedCount.textContent = `${checkedCount} sélectionné(s)`;
        }
    }

    if (selectAll) {
        selectAll.addEventListener('change', function (e) {
            orderCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            updateBatchActionsVisibility();
        });
    }

    orderCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const allChecked = Array.from(orderCheckboxes).every(c => c.checked);
            const someChecked = Array.from(orderCheckboxes).some(c => c.checked);
            if (selectAll) {
                selectAll.checked = allChecked;
                selectAll.indeterminate = someChecked && !allChecked;
            }
            updateBatchActionsVisibility();
        });
    });

    // ==========================
    // 5. Filtres Avancés
    // ==========================
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchOrder = document.getElementById('searchOrder');

    function parseFrenchDate(dateStr) {
        const parts = dateStr.trim().split(" ");
        if (parts.length < 3) return null;

        const day = parseInt(parts[0]);
        const monthStr = parts[1].toLowerCase();
        const year = parseInt(parts[2]);

        let month = null;
        for (const [key, value] of Object.entries(config.monthMap)) {
            if (monthStr.startsWith(key)) {
                month = value;
                break;
            }
        }

        return month !== null ? new Date(year, month, day) : null;
    }

    function filterByDate(dateCell, filterValue) {
        const rowDate = parseFrenchDate(dateCell.textContent);
        if (!rowDate) return true;

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
                return rowDate.getMonth() === today.getMonth() &&
                    rowDate.getFullYear() === today.getFullYear();
            case 'custom':
                // À implémenter : logique pour la sélection de date personnalisée
                return true;
            default:
                return true;
        }
    }

    function applyFilters() {
        const filters = {
            status: statusFilter?.value.toLowerCase() || '',
            date: dateFilter?.value.toLowerCase() || '',
            search: searchOrder?.value.toLowerCase() || ''
        };

        document.querySelectorAll('.orders-table tbody tr').forEach(row => {
            const statusCell = row.querySelector('.status-badge');
            const dateCell = row.querySelector('td:nth-child(4) span:first-child');
            const orderIdCell = row.querySelector('.order-id');
            const customerCell = row.querySelector('.customer-info h4');

            const matchesStatus = !filters.status ||
                (statusCell?.textContent.toLowerCase() || '').includes(filters.status);
            const matchesDate = !filters.date ||
                (dateCell && filterByDate(dateCell, filters.date));
            const matchesSearch = !filters.search ||
                (orderIdCell?.textContent.toLowerCase() || '').includes(filters.search) ||
                (customerCell?.textContent.toLowerCase() || '').includes(filters.search);

            row.style.display = (matchesStatus && matchesDate && matchesSearch) ? '' : 'none';
        });

        updatePagination();
        updateEmptyState();
    }

    // Gestionnaires d'événements pour les filtres
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (dateFilter) dateFilter.addEventListener('change', applyFilters);
    if (searchOrder) searchOrder.addEventListener('input', debounce(applyFilters, config.debounceDelay));

    // ==========================
    // 6. Gestion des Modals
    // ==========================
    function initializeModals() {
        // Modal de détail des commandes
        document.querySelectorAll('.action-btn[title="Voir"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = btn.closest('tr').querySelector('.order-id').textContent;
                const modal = document.getElementById('orderDetailModal');
                if (modal) {
                    modal.classList.add('active');
                    modal.querySelector('.modal-header h2').textContent = `Détails de la commande ${orderId}`;
                }
            });
        });

        // Modal de mise à jour groupée
        const batchUpdateModal = document.getElementById('batchUpdateModal');
        const batchUpdateButton = document.getElementById('batchUpdate');
        const confirmBatchUpdateButton = document.getElementById('confirmBatchUpdate');

        if (batchUpdateButton) {
            batchUpdateButton.addEventListener('click', () => {
                const selectedOrders = getSelectedOrders();
                if (selectedOrders.length === 0) {
                    showNotification('Veuillez sélectionner au moins une commande', 'warning');
                    return;
                }
                if (batchUpdateModal) batchUpdateModal.classList.add('active');
            });
        }

        if (confirmBatchUpdateButton) {
            confirmBatchUpdateButton.addEventListener('click', () => handleBatchUpdate());
        }

        // Fermeture des modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('active');
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }

    // ==========================
    // 7. Pagination
    // ==========================
    function updatePagination() {
        const visibleRows = getVisibleRows();
        const totalPages = Math.ceil(visibleRows.length / config.rowsPerPage);

        const paginationContainer = document.querySelector('.pagination-pages');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        // Première page
        if (totalPages > 3) {
            addPageButton(1);
        }

        // Pages actuelles
        for (let i = 1; i <= Math.min(totalPages, 3); i++) {
            addPageButton(i);
        }

        // Dernière page
        if (totalPages > 3) {
            addPageButton(totalPages);
        }

        // Initialiser avec la première page
        if (visibleRows.length > 0) {
            loadPage(1, visibleRows);
        }

        updatePaginationInfo(1, Math.min(config.rowsPerPage, visibleRows.length), visibleRows.length);
    }

    function loadPage(page, visibleRows) {
        const start = (page - 1) * config.rowsPerPage;
        const end = start + config.rowsPerPage;

        visibleRows.forEach((row, index) => {
            row.style.display = (index >= start && index < end) ? '' : 'none';
        });

        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.textContent) === page);
        });

        updatePaginationInfo(start + 1, Math.min(end, visibleRows.length), visibleRows.length);
    }

    function updatePaginationInfo(start, end, total) {
        const info = document.querySelector('.pagination-info');
        if (info) {
            info.textContent = `Affichage de ${start}-${end} sur ${total} commandes`;
        }
    }

    function addPageButton(pageNum) {
        const paginationContainer = document.querySelector('.pagination-pages');
        const button = document.createElement('button');
        button.className = 'page-btn' + (pageNum === 1 ? ' active' : '');
        button.textContent = pageNum;
        button.addEventListener('click', () => {
            loadPage(pageNum, getVisibleRows());
        });
        paginationContainer.appendChild(button);
    }

    // ==========================
    // 8. Utilitaires
    // ==========================
    function getVisibleRows() {
        return Array.from(document.querySelectorAll('.orders-table tbody tr'))
            .filter(row => row.style.display !== 'none');
    }

    function getSelectedOrders() {
        return Array.from(document.querySelectorAll('.order-select:checked'))
            .map(checkbox => checkbox.closest('tr').querySelector('.order-id').textContent.replace('#', ''))
            .filter(Boolean);
    }

    function updateEmptyState() {
        const tbody = document.querySelector('.orders-table tbody');
        const visibleRows = Array.from(tbody.querySelectorAll('tr:not([style*="display: none"])'))
            .filter(row => !row.classList.contains('empty-state'));

        let emptyState = tbody.querySelector('.empty-state');
        if (visibleRows.length === 0) {
            if (!emptyState) {
                emptyState = document.createElement('tr');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <td colspan="8">
                        <div class="empty-state-content">
                            <i class="fas fa-search"></i>
                            <p>Aucune commande ne correspond à vos critères</p>
                            <button class="btn btn-outline btn-sm" onclick="resetFilters()">
                                <i class="fas fa-undo"></i> Réinitialiser les filtres
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(emptyState);
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    }

    // Fonction de réinitialisation des filtres
    window.resetFilters = function () {
        if (statusFilter) statusFilter.value = '';
        if (dateFilter) dateFilter.value = 'today';
        if (searchOrder) searchOrder.value = '';
        applyFilters();
        showNotification('Filtres réinitialisés', 'info');
    };

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

    // ==========================
    // 9. Gestion des mises à jour groupées
    // ==========================
    async function handleBatchUpdate() {
        const selectedOrders = getSelectedOrders();
        const newStatus = document.getElementById('batchStatus').value;
        const note = document.getElementById('batchNote').value;

        if (!newStatus) {
            showNotification('Veuillez sélectionner un statut', 'warning');
            return;
        }

        try {
            showNotification('Mise à jour en cours...', 'info');

            const response = await fetch('/dashboard/orders/batch-update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({
                    orders: selectedOrders,
                    status: newStatus,
                    note: note
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour');
            }

            const result = await response.json();
            showNotification(result.message || 'Mise à jour effectuée avec succès', 'success');

            // Fermer le modal
            const modal = document.getElementById('batchUpdateModal');
            if (modal) modal.classList.remove('active');

            // Réinitialiser le formulaire
            document.getElementById('batchStatus').value = '';
            document.getElementById('batchNote').value = '';

            // Recharger la page après un court délai
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors de la mise à jour des commandes', 'error');
        }
    }

    // ==========================
    // 10. Gestion des fichiers joints
    // ==========================
    const fileInput = document.getElementById('fileInput');
    const attachFileButton = document.querySelector('.note-actions .btn-outline');

    if (attachFileButton && fileInput) {
        attachFileButton.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;

            const maxSize = 5 * 1024 * 1024; // 5 MB
            if (file.size > maxSize) {
                showNotification('Le fichier est trop volumineux. Maximum 5 MB.', 'error');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('order_id', getCurrentOrderId());

                const response = await fetch('/dashboard/orders/attach-file/', {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: formData
                });

                if (!response.ok) throw new Error('Erreur lors du téléchargement');

                const result = await response.json();
                showNotification('Fichier joint avec succès', 'success');
                updateAttachmentsList(result.attachment);

            } catch (error) {
                console.error('Erreur:', error);
                showNotification('Erreur lors du téléchargement du fichier', 'error');
            }
        });
    }

    function getCurrentOrderId() {
        return document.querySelector('#orderDetailModal .modal-header h2')
            ?.textContent?.match(/#([^#]+)$/)?.[1];
    }

    function updateAttachmentsList(attachment) {
        const attachmentsList = document.querySelector('.attachments-list');
        if (!attachmentsList) return;

        const newAttachment = document.createElement('div');
        newAttachment.className = 'attachment-item';
        newAttachment.innerHTML = `
            <i class="fas fa-${getFileIcon(attachment.filename)}"></i>
            <span>${attachment.filename}</span>
            <div class="attachment-actions">
                <button class="btn btn-sm" onclick="downloadAttachment('${attachment.id}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn-sm" onclick="deleteAttachment('${attachment.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        attachmentsList.appendChild(newAttachment);
    }

    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return 'file-pdf';
            case 'doc':
            case 'docx': return 'file-word';
            case 'xls':
            case 'xlsx': return 'file-excel';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return 'file-image';
            default: return 'file';
        }
    }

    // ==========================
    // 11. Initialisation
    // ==========================
    function init() {
        // Initialiser les composants
        initializeModals();
        updateBatchActionsVisibility();
        applyFilters();

        // Attacher l'exportation
        document.getElementById('exportOrders')?.addEventListener('click', () => showExportModal());
        document.getElementById('batchExport')?.addEventListener('click', () => {
            const selectedIds = getSelectedOrders();
            if (selectedIds.length === 0) {
                showNotification('Veuillez sélectionner au moins une commande', 'warning');
                return;
            }
            showExportModal(selectedIds);
        });

        // Navigation au clavier dans le tableau
        document.addEventListener('keydown', handleTableNavigation);
    }

    function handleTableNavigation(e) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            const activeRow = document.activeElement.closest('tr');
            if (activeRow) {
                e.preventDefault();
                const rows = Array.from(document.querySelectorAll('.orders-table tbody tr:not([style*="display: none"])'));
                const currentIndex = rows.indexOf(activeRow);
                const nextIndex = e.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;

                if (nextIndex >= 0 && nextIndex < rows.length) {
                    const nextRow = rows[nextIndex];
                    nextRow.querySelector('.action-btn')?.focus();
                }
            }
        }
    }

    // Démarrer l'application
    init();
});