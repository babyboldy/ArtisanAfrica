// order.js - Script amélioré pour la gestion des commandes

document.addEventListener('DOMContentLoaded', function () {
    console.log("Script de gestion des commandes chargé");

    // Configuration
    const CONFIG = {
        rowsPerPage: 10,
        debounceDelay: 300,
        animationDuration: 300,
        statusColors: {
            'pending': '#f59e0b',
            'processing': '#0ea5e9',
            'shipped': '#6b21a8',
            'delivered': '#22c55e',
            'cancelled': '#e11d48'
        }
    };

    // Constantes globales
    // Récupérer le CSRF token à partir de la balise meta ou d'une variable globale
    const CSRF_TOKEN = document.querySelector('input[name=csrfmiddlewaretoken]')?.value ||
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
        window.csrfToken;

    // Base URL pour les appels API
    const API_BASE_URL = '';

    // Helper pour obtenir les termes traduits du statut des commandes
    const getStatusText = (status) => {
        return window.orderStatusChoices?.[status] || status;
    };

    const getPaymentStatusText = (status) => {
        return window.paymentStatusChoices?.[status] || status;
    };

    const getPaymentMethodText = (method) => {
        return window.paymentMethodChoices?.[method] || method;
    };

    // Éléments DOM
    const DOM = {
        // Tableau de commandes
        orderTable: document.querySelector('.orders-table'),
        orderRows: document.querySelectorAll('.orders-table tbody tr'),
        selectAll: document.getElementById('selectAll'),
        orderCheckboxes: document.querySelectorAll('.order-select'),

        // Barre d'outils
        searchInput: document.getElementById('searchOrder'),
        statusFilter: document.getElementById('statusFilter'),
        paymentFilter: document.getElementById('paymentFilter'),
        dateFilter: document.getElementById('dateFilter'),

        // Actions groupées
        batchActions: document.querySelector('.batch-actions'),
        selectedCount: document.querySelector('.selected-count'),
        batchUpdateBtn: document.getElementById('batchUpdate'),

        // Modals
        modals: document.querySelectorAll('.modal'),
        orderDetailModal: document.getElementById('orderDetailModal'),
        batchUpdateModal: document.getElementById('batchUpdateModal'),
        trackingModal: document.getElementById('trackingModal'),
        confirmationModal: document.getElementById('confirmationModal'),

        // Options menu
        optionsMenu: document.getElementById('optionsMenu'),

        // Éléments du modal de détail
        modalOrderNumber: document.getElementById('modalOrderNumber'),
        orderStatusBadge: document.getElementById('orderStatusBadge'),
        orderDate: document.getElementById('orderDate'),
        paymentMethod: document.getElementById('paymentMethod'),
        paymentStatus: document.getElementById('paymentStatus'),
        trackingNumber: document.getElementById('trackingNumber'),
        estimatedDelivery: document.getElementById('estimatedDelivery'),
        customerName: document.getElementById('customerName'),
        customerEmail: document.getElementById('customerEmail'),
        customerSince: document.getElementById('customerSince'),
        orderCount: document.getElementById('orderCount'),
        shippingAddress: document.getElementById('shippingAddress'),
        billingAddress: document.getElementById('billingAddress'),
        orderItemsTable: document.getElementById('orderItemsTable'),
        subtotalValue: document.getElementById('subtotalValue'),
        taxValue: document.getElementById('taxValue'),
        shippingValue: document.getElementById('shippingValue'),
        totalValue: document.getElementById('totalValue'),
        orderTimeline: document.getElementById('orderTimeline'),
        orderNotes: document.getElementById('orderNotes'),

        // Boutons d'action
        viewButtons: document.querySelectorAll('.view-btn'),
        optionsButtons: document.querySelectorAll('.options-btn'),
        statusChangeBtn: document.querySelector('.status-change-btn'),
        statusOptions: document.querySelectorAll('.status-option'),
        editTrackingBtn: document.getElementById('editTrackingBtn'),
        printInvoiceBtn: document.getElementById('printInvoiceBtn'),
        generateInvoiceBtn: document.getElementById('generateInvoiceBtn'),
        updateOrderBtn: document.getElementById('updateOrderBtn'),
        addNoteBtn: document.getElementById('addNoteBtn'),
        saveTrackingBtn: document.getElementById('saveTrackingBtn'),
        confirmBatchUpdateBtn: document.getElementById('confirmBatchUpdate'),

        // Templates
        timelineItemTemplate: document.getElementById('timelineItemTemplate'),
        noteItemTemplate: document.getElementById('noteItemTemplate'),
    };

    // Variables d'état
    let currentOrderId = null;
    let currentOrder = null;

    // Initialisation
    initTableCheckboxes();
    initFilterSearch();
    initModals();
    initViewButtons();
    initOptionsButtons();
    initOrderDetailActions();
    initBatchActions();

    // Dans initOrderDetailActions()
    const paymentStatusChangeBtn = document.querySelector('.payment-status-btn');
    const paymentStatusOptions = document.querySelectorAll('.payment-status-option');

    if (paymentStatusChangeBtn && paymentStatusOptions) {
        paymentStatusChangeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            this.closest('.status-selector').classList.toggle('active');
        });

        paymentStatusOptions.forEach(option => {
            option.addEventListener('click', function () {
                const status = this.getAttribute('data-status');
                if (currentOrderId) {
                    changePaymentStatus(currentOrderId, status);
                }
                this.closest('.status-selector').classList.remove('active');
            });
        });
    }

    // Gestion des cases à cocher du tableau
    function initTableCheckboxes() {
        if (DOM.selectAll) {
            DOM.selectAll.addEventListener('change', function () {
                DOM.orderCheckboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                    const row = checkbox.closest('tr');
                    if (row) {
                        row.classList.toggle('selected', this.checked);
                    }
                });
                updateBatchActions();
            });
        }

        DOM.orderCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                const row = this.closest('tr');
                if (row) {
                    row.classList.toggle('selected', this.checked);
                }
                updateSelectAllState();
                updateBatchActions();
            });
        });
    }

    // Mise à jour de l'état du bouton "Tout sélectionner"
    function updateSelectAllState() {
        if (!DOM.selectAll) return;

        const totalCheckboxes = DOM.orderCheckboxes.length;
        const checkedCheckboxes = document.querySelectorAll('.order-select:checked').length;

        DOM.selectAll.checked = totalCheckboxes > 0 && checkedCheckboxes === totalCheckboxes;
        DOM.selectAll.indeterminate = checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes;
    }

    // Mise à jour de la visibilité des actions groupées
    function updateBatchActions() {
        if (!DOM.batchActions || !DOM.selectedCount) return;

        const checkedCount = document.querySelectorAll('.order-select:checked').length;

        DOM.batchActions.style.display = checkedCount > 0 ? 'flex' : 'none';
        DOM.selectedCount.textContent = `${checkedCount} sélectionné(s)`;

        // Mettre à jour les IDs des commandes pour la mise à jour groupée
        const selectedIds = getSelectedOrderIds();
        const batchOrderIds = document.getElementById('batchOrderIds');
        if (batchOrderIds) {
            batchOrderIds.value = selectedIds.join(',');
        }
    }

    // Récupérer les IDs des commandes sélectionnées
    function getSelectedOrderIds() {
        return Array.from(document.querySelectorAll('.order-select:checked'))
            .map(checkbox => checkbox.getAttribute('data-id'))
            .filter(Boolean);
    }

    // Initialiser les filtres et la recherche
    function initFilterSearch() {
        // Recherche
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', debounce(() => {
                filterOrders();
            }, CONFIG.debounceDelay));
        }

        // Filtres
        [DOM.statusFilter, DOM.paymentFilter, DOM.dateFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => {
                    filterOrders();
                });
            }
        });
    }

    // Filtrer les commandes
    function filterOrders() {
        const searchTerm = DOM.searchInput?.value.toLowerCase() || '';
        const statusFilter = DOM.statusFilter?.value || '';
        const paymentFilter = DOM.paymentFilter?.value || '';
        const dateFilter = DOM.dateFilter?.value || '';

        let visibleCount = 0;

        DOM.orderRows.forEach(row => {
            if (row.querySelector('.empty-state')) return;

            // Extraire les données à filtrer
            const orderNumber = row.querySelector('.order-id')?.textContent?.toLowerCase() || '';
            const customerEmail = row.querySelector('.customer-email')?.textContent?.toLowerCase() || '';
            const status = Array.from(row.querySelector('.status-badge')?.classList || [])
                .find(cls => cls !== 'status-badge') || '';
            const payment = Array.from(row.querySelector('.payment-status')?.classList || [])
                .find(cls => cls !== 'payment-status') || '';
            const dateText = row.querySelector('.date-info span:first-child')?.textContent || '';

            // Appliquer les filtres
            const matchesSearch = !searchTerm ||
                orderNumber.includes(searchTerm) ||
                customerEmail.includes(searchTerm);

            const matchesStatus = !statusFilter || status === statusFilter;

            const matchesPayment = !paymentFilter || payment === paymentFilter;

            const matchesDate = !dateFilter || dateFilter === 'all' ||
                matchesDateFilter(dateText, dateFilter);

            // Définir la visibilité
            const isVisible = matchesSearch && matchesStatus && matchesPayment && matchesDate;
            row.style.display = isVisible ? '' : 'none';

            if (isVisible) visibleCount++;
        });

        // Afficher un message si aucun résultat
        showNoResults(visibleCount === 0);
    }

    // Vérifier si une date correspond à un filtre
    function matchesDateFilter(dateText, filter) {
        if (!dateText) return false;

        try {
            // Format attendu: "10 Fév 2024"
            const dateParts = dateText.split(' ');
            const day = parseInt(dateParts[0], 10);
            let month = -1;

            // Correspondances mois en français
            const monthMap = {
                'jan': 0, 'fév': 1, 'mar': 2, 'avr': 3, 'mai': 4, 'juin': 5,
                'juil': 6, 'aoû': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'déc': 11
            };

            const monthAbbr = dateParts[1].toLowerCase();
            for (const [abbr, idx] of Object.entries(monthMap)) {
                if (monthAbbr.startsWith(abbr)) {
                    month = idx;
                    break;
                }
            }

            if (month === -1) return false;
            const year = parseInt(dateParts[2], 10);
            const date = new Date(year, month, day);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Appliquer les filtres de date
            if (filter === 'today') {
                return isSameDay(date, today);
            } else if (filter === 'week') {
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                return date >= lastWeek;
            } else if (filter === 'month') {
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                return date >= firstDayOfMonth;
            }

            return true;
        } catch (error) {
            console.error('Erreur lors du filtrage par date:', error);
            return true; // En cas d'erreur, inclure quand même
        }
    }

    // Vérifier si deux dates sont le même jour
    function isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    // Afficher un message si aucun résultat de filtrage
    function showNoResults(noResults) {
        const tbody = DOM.orderTable?.querySelector('tbody');
        if (!tbody) return;

        let noResultsRow = tbody.querySelector('.no-results-row');

        if (noResults) {
            if (!noResultsRow) {
                noResultsRow = document.createElement('tr');
                noResultsRow.className = 'no-results-row';
                noResultsRow.innerHTML = `
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <p>Aucune commande ne correspond aux critères.</p>
                            <button class="btn btn-outline btn-sm reset-filters-btn">
                                <i class="fas fa-undo"></i> Réinitialiser les filtres
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(noResultsRow);

                // Événement pour réinitialiser les filtres
                noResultsRow.querySelector('.reset-filters-btn').addEventListener('click', resetFilters);
            }
        } else if (noResultsRow) {
            noResultsRow.remove();
        }
    }

    // Réinitialiser tous les filtres
    function resetFilters() {
        if (DOM.searchInput) DOM.searchInput.value = '';
        if (DOM.statusFilter) DOM.statusFilter.selectedIndex = 0;
        if (DOM.paymentFilter) DOM.paymentFilter.selectedIndex = 0;
        if (DOM.dateFilter) DOM.dateFilter.selectedIndex = 0;

        filterOrders();
    }

    // Initialiser les modals
    function initModals() {
        // Fermer tous les modals
        document.querySelectorAll('.modal .close-modal, .modal [data-dismiss="modal"]').forEach(closeBtn => {
            closeBtn.addEventListener('click', function () {
                const modal = this.closest('.modal');
                if (modal) {
                    closeModal(modal);
                }
            });
        });

        // Fermer en cliquant en dehors du contenu
        DOM.modals.forEach(modal => {
            modal.addEventListener('click', function (e) {
                if (e.target === this) {
                    closeModal(this);
                }
            });
        });

        // Touche Échap pour fermer les modals
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    closeModal(activeModal);
                } else if (DOM.optionsMenu && DOM.optionsMenu.style.display === 'block') {
                    DOM.optionsMenu.style.display = 'none';
                }
            }
        });
    }

    // Ouvrir un modal
    function openModal(modal) {
        if (!modal) return;

        // Fermer tous les autres modals
        document.querySelectorAll('.modal.active').forEach(m => {
            if (m !== modal) {
                closeModal(m);
            }
        });

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Fermer un modal
    function closeModal(modal) {
        if (!modal) return;

        modal.classList.remove('active');

        // Restaurer le scroll seulement si aucun autre modal n'est ouvert
        if (!document.querySelector('.modal.active')) {
            document.body.style.overflow = '';
        }
    }

    // Initialiser les boutons "Voir"
    function initViewButtons() {
        DOM.viewButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();

                const orderId = this.getAttribute('data-id');
                if (orderId) {
                    loadOrderDetails(orderId);
                }
            });
        });

        // Rendre les lignes cliquables pour ouvrir les détails
        DOM.orderRows.forEach(row => {
            if (!row.querySelector('.empty-state')) {
                row.addEventListener('click', function (e) {
                    // Ne pas déclencher si on clique sur une case à cocher ou un bouton
                    if (e.target.closest('.checkbox-wrapper') || e.target.closest('.action-btn')) {
                        return;
                    }

                    const orderId = this.getAttribute('data-id');
                    if (orderId) {
                        loadOrderDetails(orderId);
                    }
                });
            }
        });
    }

    // Initialiser les boutons "Options"
    function initOptionsButtons() {
        DOM.optionsButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();

                const orderId = this.getAttribute('data-id');
                if (orderId) {
                    showOptionsMenu(this, orderId);
                }
            });
        });

        // Fermer le menu d'options en cliquant en dehors
        document.addEventListener('click', function (e) {
            const optionsMenu = DOM.optionsMenu;
            if (optionsMenu &&
                optionsMenu.style.display === 'block' &&
                !optionsMenu.contains(e.target) &&
                !e.target.classList.contains('options-btn')) {
                optionsMenu.style.display = 'none';
            }
        });

        // Fermer le menu avec le bouton X
        const closeOptionsBtn = document.querySelector('.close-options-menu');
        if (closeOptionsBtn) {
            closeOptionsBtn.addEventListener('click', function () {
                if (DOM.optionsMenu) {
                    DOM.optionsMenu.style.display = 'none';
                }
            });
        }
    }

    // Afficher le menu d'options
    function showOptionsMenu(buttonElement, orderId) {
        const optionsMenu = DOM.optionsMenu;
        if (!optionsMenu) return;

        // Configurer les actions du menu pour cette commande
        const viewAction = optionsMenu.querySelector('[data-action="view"]');
        if (viewAction) {
            viewAction.setAttribute('data-id', orderId);
            viewAction.onclick = function () {
                optionsMenu.style.display = 'none';
                loadOrderDetails(orderId);
            };
        }

        // Lien de facture
        const invoiceLink = optionsMenu.querySelector('#viewInvoiceLink');
        if (invoiceLink) {
            invoiceLink.href = `${orderId}/invoice/`;
        }

        // Actions de changement de statut
        const statusActions = optionsMenu.querySelectorAll('.status-action');
        statusActions.forEach(action => {
            action.onclick = null; // Retirer les anciens événements
            const status = action.getAttribute('data-status');
            action.addEventListener('click', function () {
                optionsMenu.style.display = 'none';
                changeOrderStatus(orderId, status);
            });
        });

        // Récupérer les dimensions de la fenêtre et de l'écran
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Si on est sur mobile, afficher le menu en bas de l'écran
        if (windowWidth <= 768) {
            optionsMenu.style.position = 'fixed';
            optionsMenu.style.bottom = '2rem';
            optionsMenu.style.left = '0';
            optionsMenu.style.right = '0';
            optionsMenu.style.margin = '0 auto';
            optionsMenu.style.width = '90%';
            optionsMenu.style.maxWidth = '320px';
            optionsMenu.style.top = 'auto';
        } else {
            // Sur desktop, positionner le menu par rapport au bouton
            const rect = buttonElement.getBoundingClientRect();

            // Position par défaut (à droite du bouton)
            let left = rect.right + 5;
            let top = rect.top;

            // Vérifier si le menu dépasse à droite
            const menuWidth = 250; // Largeur du menu en pixels
            if (left + menuWidth > windowWidth) {
                // Positionner à gauche du bouton
                left = rect.left - menuWidth - 5;

                // Si ça dépasse à gauche aussi, centrer le menu
                if (left < 0) {
                    left = Math.max(10, (windowWidth - menuWidth) / 2);
                    top = rect.bottom + 5; // Sous le bouton
                }
            }

            // Vérifier si le menu dépasse en bas
            const menuHeight = 300; // Hauteur approximative du menu
            if (top + menuHeight > windowHeight) {
                top = Math.max(10, windowHeight - menuHeight - 10);
            }

            optionsMenu.style.position = 'absolute';
            optionsMenu.style.left = `${left}px`;
            optionsMenu.style.top = `${top}px`;
            optionsMenu.style.width = '250px';
            optionsMenu.style.bottom = 'auto';
            optionsMenu.style.right = 'auto';
            optionsMenu.style.margin = '0';
        }

        // Afficher le menu
        optionsMenu.style.display = 'block';
    }

    // Changer le statut d'une commande
    function changeOrderStatus(orderId, status) {
        showToast(`Changement du statut de la commande #${orderId}...`, 'info');

        // Créer un objet FormData pour envoyer les données
        const formData = new FormData();
        formData.append('order_id', orderId);
        formData.append('status', status);
        formData.append('csrfmiddlewaretoken', CSRF_TOKEN);

        fetch(`${API_BASE_URL}change-status/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur réseau');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    updateRowStatus(orderId, status, data.status_display);
                    showToast(`Statut mis à jour avec succès`, 'success');
                } else {
                    showToast(`Erreur: ${data.error}`, 'error');
                }
            })
            .catch(error => {
                console.error('Erreur lors du changement de statut:', error);
                showToast('Erreur de communication avec le serveur', 'error');
            });
    }

    // Mettre à jour le statut dans une ligne de tableau
    function updateRowStatus(orderId, statusCode, statusDisplay) {
        const row = document.querySelector(`.orders-table tr[data-id="${orderId}"]`);
        if (row) {
            const statusBadge = row.querySelector('.status-badge');
            if (statusBadge) {
                // Supprimer toutes les classes de statut existantes
                ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].forEach(status => {
                    statusBadge.classList.remove(status);
                });

                // Ajouter la nouvelle classe de statut
                statusBadge.classList.add(statusCode);

                // Mettre à jour le texte
                statusBadge.textContent = statusDisplay || getStatusText(statusCode);

                // Effet de transition
                statusBadge.animate([
                    { transform: 'scale(0.8)', opacity: 0.5 },
                    { transform: 'scale(1.1)', opacity: 1 },
                    { transform: 'scale(1)', opacity: 1 }
                ], {
                    duration: 500,
                    easing: 'ease-in-out'
                });
            }
        }

        // Si la commande est actuellement affichée dans le modal, mettre à jour aussi
        if (currentOrderId === orderId && DOM.orderStatusBadge) {
            // Supprimer toutes les classes de statut existantes
            ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].forEach(status => {
                DOM.orderStatusBadge.classList.remove(status);
            });

            // Ajouter la nouvelle classe de statut
            DOM.orderStatusBadge.classList.add(statusCode);

            // Mettre à jour le texte
            DOM.orderStatusBadge.textContent = statusDisplay || getStatusText(statusCode);
        }
    }

    // Charger les détails d'une commande
    function loadOrderDetails(orderId) {
        showToast('Chargement des détails...', 'info');

        // Enregistrer l'ID de la commande actuelle
        currentOrderId = orderId;

        // Effectuer une requête AJAX pour obtenir les détails
        fetch(`/orders/${orderId}/details/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    currentOrder = data.order;
                    displayOrderDetails(data.order); // affiche toutes les infos dans le modal
                    openModal(DOM.orderDetailModal); // ouvre la fenêtre modale
                } else {
                    showToast(`Erreur: ${data.error}`, 'error');
                }
            })
            .catch(error => {
                console.error('Erreur lors du chargement des détails de la commande :', error);
                showToast('Une erreur est survenue lors du chargement des détails.', 'error');
            });
    }


    // Extraire les données de base d'une ligne du tableau
    function extractDataFromRow(row, orderId) {
        const orderNumber = row.querySelector('.order-id')?.textContent.trim() || '';
        const customerEmail = row.querySelector('.customer-email')?.textContent.trim() || '';
        const dateText = row.querySelector('.date-info span:first-child')?.textContent.trim() || '';
        const timeText = row.querySelector('.date-info .time')?.textContent.trim() || '';
        const statusBadge = row.querySelector('.status-badge');
        const status = statusBadge ?
            Array.from(statusBadge.classList).find(cls => ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(cls)) : 'pending';
        const statusText = statusBadge?.textContent.trim() || '';
        const paymentStatus = row.querySelector('.payment-status');
        const paymentStatusClass = paymentStatus ?
            Array.from(paymentStatus.classList).find(cls => ['pending', 'completed', 'failed', 'refunded'].includes(cls)) : 'pending';
        const paymentText = paymentStatus?.textContent.trim() || '';
        const total = row.querySelector('.price-info strong')?.textContent.trim() || '';

        // Créer un objet avec les données disponibles
        return {
            id: orderId,
            order_number: orderNumber.replace('#', ''),
            created_at: `${dateText} ${timeText}`,
            total_amount: parseFloat(total.replace('F CFA', '').trim()) || 0,
            status: status,
            status_display: statusText,
            payment_status: paymentStatusClass || 'pending',
            payment_status_display: paymentText,
            payment_method: 'card', // Valeur par défaut
            customer: {
                email: customerEmail
            },
            items: [], // Vide par défaut
            tracking_number: null,
            shipping_address: "Adresse non disponible", // Placeholder
            billing_address: "Adresse non disponible", // Placeholder
            subtotal: 0,
            tax_amount: 0,
            shipping_cost: 0,
            notes: []
        };
    }

    // Afficher les détails d'une commande dans le modal
    function displayOrderDetails(order) {
        if (!order) return;

        // Déboguer la réponse de l'API
        console.log("Détails de la commande:", order);
        console.log("Articles de la commande:", order.items);

        // Informations de base
        if (DOM.modalOrderNumber) DOM.modalOrderNumber.textContent = `#${order.order_number}`;

        // Statut
        if (DOM.orderStatusBadge) {
            DOM.orderStatusBadge.className = `status-badge ${order.status}`;
            DOM.orderStatusBadge.textContent = order.status_display || getStatusText(order.status);
        }

        // Date
        if (DOM.orderDate) DOM.orderDate.textContent = order.created_at;

        // Paiement
        if (DOM.paymentMethod) {
            DOM.paymentMethod.textContent = order.payment_method_display || getPaymentMethodText(order.payment_method);
        }

        if (DOM.paymentStatus) {
            DOM.paymentStatus.className = `payment-status ${order.payment_status}`;

            let icon = '';
            if (order.payment_status === 'completed') {
                icon = '<i class="fas fa-check-circle"></i> ';
            } else if (order.payment_status === 'failed') {
                icon = '<i class="fas fa-times-circle"></i> ';
            } else if (order.payment_status === 'refunded') {
                icon = '<i class="fas fa-undo"></i> ';
            } else {
                icon = '<i class="fas fa-clock"></i> ';
            }

            DOM.paymentStatus.innerHTML = icon + (order.payment_status_display || getPaymentStatusText(order.payment_status));
        }

        // Numéro de suivi
        if (DOM.trackingNumber) {
            DOM.trackingNumber.textContent = order.tracking_number || 'Non disponible';
        }

        // Date de livraison estimée
        if (DOM.estimatedDelivery) {
            DOM.estimatedDelivery.textContent = order.estimated_delivery_date || 'Non disponible';
        }

        // Informations client
        if (DOM.customerName) DOM.customerName.textContent = order.customer?.name || 'Client';
        if (DOM.customerEmail) DOM.customerEmail.textContent = order.customer?.email || 'Email non disponible';
        if (DOM.customerSince) {
            DOM.customerSince.textContent = order.customer?.date_joined ?
                `Client depuis ${order.customer.date_joined}` : '';
        }
        if (DOM.orderCount) {
            DOM.orderCount.textContent = order.customer?.orders_count || '1';
        }

        // Photo de profil du client
        const customerImg = document.getElementById('customerImg');
        if (customerImg) {
            customerImg.src = order.customer?.image || '/static/images/default-avatar.png';
            customerImg.onerror = function () {
                this.src = '/static/images/default-avatar.png';
            };
        }

        // Adresses
        if (DOM.shippingAddress) {
            DOM.shippingAddress.innerHTML = formatAddress(order.shipping_address);
        }

        if (DOM.billingAddress) {
            DOM.billingAddress.innerHTML = formatAddress(order.billing_address);
        }

        // Articles de la commande
        if (DOM.orderItemsTable) {
            DOM.orderItemsTable.innerHTML = '';

            if (!order.items || order.items.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="4" style="text-align: center; padding: 1rem;">Aucun article dans cette commande</td>`;
                DOM.orderItemsTable.appendChild(row);
            } else {
                order.items.forEach(item => {
                    const row = document.createElement('tr');
                    const imageUrl = item.product_image || '/static/images/default-product.png';

                    row.innerHTML = `
                        <td data-label="Produit">
                            <div class="product-info">
                                <img src="${imageUrl}" alt="${item.product_name}" onerror="this.src='/static/images/default-product.png'">
                                <div>
                                    <h4>${item.product_name}</h4>
                                    ${item.product_sku ? `<span>${item.product_sku}</span>` : ''}
                                </div>
                            </div>
                        </td>
                        <td data-label="Prix unitaire">${formatPrice(item.unit_price)}</td>
                        <td data-label="Quantité">${item.quantity}</td>
                        <td data-label="Total">${formatPrice(item.total_price)}</td>
                    `;
                    DOM.orderItemsTable.appendChild(row);
                });
            }
        }

        // Totaux
        if (DOM.subtotalValue) DOM.subtotalValue.textContent = formatPrice(order.subtotal || 0);
        if (DOM.taxValue) DOM.taxValue.textContent = formatPrice(order.tax_amount || 0);
        if (DOM.shippingValue) {
            DOM.shippingValue.textContent = order.shipping_cost > 0 ?
                formatPrice(order.shipping_cost) : 'Gratuit';
        }
        if (DOM.totalValue) DOM.totalValue.textContent = formatPrice(order.total_amount || 0);

        // Timeline
        if (DOM.orderTimeline) {
            DOM.orderTimeline.innerHTML = '';
            const timelineEvents = generateTimelineFromStatus(order.status, order.created_at);

            timelineEvents.forEach(event => {
                const template = DOM.timelineItemTemplate;
                if (!template) return;

                const clone = document.importNode(template.content, true);
                const item = clone.querySelector('.timeline-item');
                const icon = clone.querySelector('.timeline-icon i');
                const title = clone.querySelector('.timeline-content h4');
                const date = clone.querySelector('.timeline-content p');

                if (event.current) item.classList.add('current');
                icon.className = `fas ${event.icon}`;
                title.textContent = event.title;
                date.textContent = event.date;

                DOM.orderTimeline.appendChild(clone);
            });
        }

        // Notes
        if (DOM.orderNotes) {
            DOM.orderNotes.innerHTML = '';

            if (!order.notes || order.notes.length === 0) {
                DOM.orderNotes.innerHTML = `
                    <div style="text-align: center; padding: 1rem; color: var(--gray-500);">
                        Aucune note pour cette commande
                    </div>
                `;
            } else {
                order.notes.forEach(note => {
                    const template = DOM.noteItemTemplate;
                    if (!template) return;

                    const clone = document.importNode(template.content, true);
                    const authorName = clone.querySelector('.note-author span');
                    const noteDate = clone.querySelector('.note-date');
                    const noteText = clone.querySelector('p');

                    authorName.textContent = note.user || 'Système';
                    noteDate.textContent = note.created_at;
                    noteText.textContent = note.note;

                    if (note.attachment) {
                        const attachmentDiv = document.createElement('div');
                        attachmentDiv.className = 'note-attachment';
                        attachmentDiv.innerHTML = `
                            <i class="fas fa-paperclip"></i>
                            <a href="${note.attachment}" target="_blank">Pièce jointe</a>
                        `;
                        noteText.after(attachmentDiv);
                    }

                    DOM.orderNotes.appendChild(clone);
                });
            }
        }

        const orderIdForNote = document.getElementById('orderIdForNote');
        if (orderIdForNote) {
            orderIdForNote.value = order.id;
        }

        if (DOM.generateInvoiceBtn) {
            DOM.generateInvoiceBtn.href = `${order.id}/invoice/`;
        }
    }


    // Formater une adresse pour l'affichage HTML
    function formatAddress(address) {
        if (!address) return '<p>Adresse non disponible</p>';

        // Si l'adresse est déjà un format HTML, la retourner telle quelle
        if (address.includes('<p>') || address.includes('<div>')) {
            return address;
        }

        // Sinon, convertir le texte en paragraphes HTML
        return address.split('\n')
            .map(line => `<p>${line.trim()}</p>`)
            .join('');
    }

    // Générer une timeline basée sur le statut actuel de la commande
    function generateTimelineFromStatus(status, createdAt) {
        // Date de création de la commande ou date actuelle
        const orderDate = createdAt ? new Date(createdAt) : new Date();

        // Événements de la timeline
        const events = [
            {
                title: 'Commande passée',
                icon: 'fa-shopping-cart',
                date: formatDate(orderDate),
                current: status === 'pending',
                order: 1
            },
            {
                title: 'En traitement',
                icon: 'fa-box',
                date: status === 'pending' ? 'À venir' : formatDate(addDays(orderDate, 1)),
                current: status === 'processing',
                order: 2
            },
            {
                title: 'Expédiée',
                icon: 'fa-truck',
                date: ['pending', 'processing'].includes(status) ? 'À venir' : formatDate(addDays(orderDate, 3)),
                current: status === 'shipped',
                order: 3
            },
            {
                title: 'Livrée',
                icon: 'fa-check-circle',
                date: ['pending', 'processing', 'shipped'].includes(status) ? 'À venir' : formatDate(addDays(orderDate, 5)),
                current: status === 'delivered',
                order: 4
            }
        ];

        // Si la commande est annulée, ajouter un événement d'annulation
        if (status === 'cancelled') {
            events.push({
                title: 'Commande annulée',
                icon: 'fa-times-circle',
                date: formatDate(new Date()),
                current: true,
                order: 5
            });
        }

        // Trier par ordre
        return events.sort((a, b) => a.order - b.order);
    }

    // Initialiser les actions du modal de détail de commande
    function initOrderDetailActions() {
        // Changement de statut
        if (DOM.statusChangeBtn && DOM.statusOptions) {
            // Ouvrir/fermer le dropdown de statut
            DOM.statusChangeBtn.addEventListener('click', function (e) {
                e.stopPropagation();

                const selector = this.closest('.status-selector');
                if (selector) {
                    selector.classList.toggle('active');
                }
            });

            // Masquer le dropdown si on clique ailleurs
            document.addEventListener('click', function (e) {
                const activeSelector = document.querySelector('.status-selector.active');
                if (activeSelector && !activeSelector.contains(e.target)) {
                    activeSelector.classList.remove('active');
                }
            });

            // Changer le statut
            DOM.statusOptions.forEach(option => {
                option.addEventListener('click', function () {
                    const status = this.getAttribute('data-status');
                    const statusText = this.querySelector('.status-badge').textContent;

                    // Mettre à jour l'affichage
                    const selector = this.closest('.status-selector');
                    const badge = selector.querySelector('.status-badge');

                    badge.className = `status-badge ${status}`;
                    badge.textContent = statusText;

                    // Fermer le dropdown
                    selector.classList.remove('active');

                    // Sauvegarder le changement
                    if (currentOrderId) {
                        changeOrderStatus(currentOrderId, status);
                    }
                });
            });
        }

        // Modification du numéro de suivi
        if (DOM.editTrackingBtn && DOM.trackingModal) {
            DOM.editTrackingBtn.addEventListener('click', function () {
                const trackingNumber = DOM.trackingNumber.textContent;
                const trackingInput = document.getElementById('trackingNumberInput');
                const trackingOrderId = document.getElementById('trackingOrderId');

                if (trackingInput) {
                    trackingInput.value = trackingNumber === 'Non disponible' ? '' : trackingNumber;
                }

                if (trackingOrderId && currentOrderId) {
                    trackingOrderId.value = currentOrderId;
                }

                openModal(DOM.trackingModal);
            });
        }

        // Sauvegarder le numéro de suivi
        if (DOM.saveTrackingBtn) {
            DOM.saveTrackingBtn.addEventListener('click', function () {
                const trackingInput = document.getElementById('trackingNumberInput');
                const trackingOrderId = document.getElementById('trackingOrderId');

                if (!trackingInput || !trackingOrderId) return;

                const trackingNumber = trackingInput.value.trim();
                const orderId = trackingOrderId.value;

                if (!orderId) return;

                // Envoyer la requête AJAX
                fetch(`${API_BASE_URL}/${orderId}/update-tracking/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: `tracking_number=${encodeURIComponent(trackingNumber)}`
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Mettre à jour l'affichage
                            if (DOM.trackingNumber) {
                                DOM.trackingNumber.textContent = trackingNumber || 'Non disponible';
                            }

                            showToast('Numéro de suivi mis à jour avec succès', 'success');
                            closeModal(DOM.trackingModal);
                        } else {
                            showToast(`Erreur: ${data.error}`, 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur lors de la mise à jour du numéro de suivi:', error);

                        // En cas d'erreur, faire quand même la mise à jour dans l'interface
                        if (DOM.trackingNumber) {
                            DOM.trackingNumber.textContent = trackingNumber || 'Non disponible';
                        }

                        showToast('Le numéro de suivi a été mis à jour localement', 'warning');
                        closeModal(DOM.trackingModal);
                    });
            });
        }

        // Ajout de note
        const noteForm = document.getElementById('noteForm');
        if (noteForm) {
            noteForm.addEventListener('submit', function (e) {
                e.preventDefault();

                const noteText = document.getElementById('newNoteText').value.trim();
                const orderId = document.getElementById('orderIdForNote').value;

                if (!noteText || !orderId) {
                    showToast('Veuillez saisir une note', 'warning');
                    return;
                }

                // Créer un objet FormData pour gérer les fichiers
                const formData = new FormData(this);

                // Envoyer la requête AJAX
                fetch(`${API_BASE_URL}/${orderId}/add-note/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Ajouter la note à l'interface
                            addNoteToUI(data);

                            // Vider le formulaire
                            document.getElementById('newNoteText').value = '';
                            document.getElementById('noteAttachment').value = '';
                            document.getElementById('attachFileBtn').innerHTML = '<i class="fas fa-paperclip"></i> Joindre';

                            showToast('Note ajoutée avec succès', 'success');
                        } else {
                            showToast(`Erreur: ${data.error}`, 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur lors de l\'ajout de la note:', error);

                        // En cas d'erreur, ajouter quand même la note à l'interface
                        const fallbackNote = {
                            note_text: noteText,
                            date: formatDate(new Date()),
                            user: 'Vous'
                        };

                        addNoteToUI(fallbackNote);
                        document.getElementById('newNoteText').value = '';

                        showToast('La note a été ajoutée localement', 'warning');
                    });
            });
        }

        // Champ d'ajout de pièce jointe
        const attachFileBtn = document.getElementById('attachFileBtn');
        const noteAttachment = document.getElementById('noteAttachment');

        if (attachFileBtn && noteAttachment) {
            attachFileBtn.addEventListener('click', function () {
                noteAttachment.click();
            });

            noteAttachment.addEventListener('change', function () {
                if (this.files.length > 0) {
                    const fileName = this.files[0].name;
                    attachFileBtn.innerHTML = `<i class="fas fa-paperclip"></i> ${fileName}`;
                } else {
                    attachFileBtn.innerHTML = '<i class="fas fa-paperclip"></i> Joindre';
                }
            });
        }

        // Impression de facture
        if (DOM.printInvoiceBtn) {
            DOM.printInvoiceBtn.addEventListener('click', function () {
                if (!currentOrderId) return;

                const invoiceUrl = `${API_BASE_URL}/${currentOrderId}/invoice/`;

                // Ouvrir l'URL dans une nouvelle fenêtre pour impression
                const printWindow = window.open(invoiceUrl, '_blank');

                // Attendre que la fenêtre soit chargée, puis imprimer
                if (printWindow) {
                    printWindow.addEventListener('load', function () {
                        printWindow.print();
                    });
                }
            });
        }

        // Mise à jour globale de la commande
        if (DOM.updateOrderBtn) {
            DOM.updateOrderBtn.addEventListener('click', function () {
                closeModal(DOM.orderDetailModal);
                showToast('Commande mise à jour avec succès', 'success');
            });
        }
    }

    // Ajoutez cette fonction dans order.js
    function changePaymentStatus(orderId, status) {
        showToast(`Changement du statut de paiement de la commande #${orderId}...`, 'info');

        const formData = new FormData();
        formData.append('order_id', orderId);
        formData.append('status', status);
        formData.append('csrfmiddlewaretoken', CSRF_TOKEN);

        fetch(`${API_BASE_URL}change-payment-status/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur réseau');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    updatePaymentStatusInUI(orderId, status, data.payment_status_display);
                    showToast(`Statut de paiement mis à jour avec succès`, 'success');
                } else {
                    showToast(`Erreur: ${data.error}`, 'error');
                }
            })
            .catch(error => {
                console.error('Erreur lors du changement de statut de paiement:', error);
                showToast('Erreur de communication avec le serveur', 'error');
            });
    }

    function updatePaymentStatusInUI(orderId, statusCode, statusDisplay) {
        // Mettre à jour dans le tableau
        const row = document.querySelector(`.orders-table tr[data-id="${orderId}"]`);
        if (row) {
            const paymentStatus = row.querySelector('.payment-status');
            if (paymentStatus) {
                // Supprimer toutes les classes de statut existantes
                ['pending', 'completed', 'failed', 'refunded'].forEach(status => {
                    paymentStatus.classList.remove(status);
                });

                // Ajouter la nouvelle classe de statut
                paymentStatus.classList.add(statusCode);

                // Mettre à jour le texte
                let icon = '';
                if (statusCode === 'completed') {
                    icon = '<i class="fas fa-check-circle"></i> ';
                } else if (statusCode === 'failed') {
                    icon = '<i class="fas fa-times-circle"></i> ';
                } else if (statusCode === 'refunded') {
                    icon = '<i class="fas fa-undo"></i> ';
                } else {
                    icon = '<i class="fas fa-clock"></i> ';
                }

                paymentStatus.innerHTML = icon + (statusDisplay || getPaymentStatusText(statusCode));
            }
        }

        // Mettre à jour dans le modal si ouvert
        if (currentOrderId === orderId && DOM.paymentStatus) {
            DOM.paymentStatus.className = `payment-status ${statusCode}`;
            DOM.paymentStatus.innerHTML = icon + (statusDisplay || getPaymentStatusText(statusCode));
        }
    }



    // Ajouter une note à l'interface
    function addNoteToUI(noteData) {
        if (!DOM.orderNotes) return;

        // Supprimer le message "Aucune note"
        const emptyMessage = DOM.orderNotes.querySelector('div[style*="text-align: center"]');
        if (emptyMessage) {
            emptyMessage.remove();
        }

        // Créer la nouvelle note à partir du template
        const template = DOM.noteItemTemplate;
        if (!template) return;

        const clone = document.importNode(template.content, true);
        const authorName = clone.querySelector('.note-author span');
        const noteDate = clone.querySelector('.note-date');
        const noteText = clone.querySelector('p');

        authorName.textContent = noteData.user || 'Vous';
        noteDate.textContent = noteData.date || formatDate(new Date());
        noteText.textContent = noteData.note_text || noteData.note;

        // Ajouter une pièce jointe si fournie
        if (noteData.attachment) {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'note-attachment';
            attachmentDiv.innerHTML = `
                <i class="fas fa-paperclip"></i>
                <a href="${noteData.attachment}" target="_blank">Pièce jointe</a>
            `;
            noteText.after(attachmentDiv);
        }

        // Ajouter la note en haut de la liste
        DOM.orderNotes.insertBefore(clone, DOM.orderNotes.firstChild);
    }

    // Initialiser les actions groupées
    function initBatchActions() {
        // Ouvrir le modal de mise à jour groupée
        if (DOM.batchUpdateBtn && DOM.batchUpdateModal) {
            DOM.batchUpdateBtn.addEventListener('click', function () {
                // Vérifier que des commandes sont sélectionnées
                const selectedIds = getSelectedOrderIds();
                if (selectedIds.length === 0) {
                    showToast('Veuillez sélectionner au moins une commande', 'warning');
                    return;
                }

                // Mettre à jour la liste des IDs sélectionnés
                document.getElementById('batchOrderIds').value = selectedIds.join(',');

                // Ouvrir le modal
                openModal(DOM.batchUpdateModal);
            });
        }

        // Confirmer la mise à jour groupée
        if (DOM.confirmBatchUpdateBtn) {
            DOM.confirmBatchUpdateBtn.addEventListener('click', function () {
                const batchStatus = document.getElementById('batchStatus').value;
                const batchNote = document.getElementById('batchNote').value.trim();
                const batchOrderIds = document.getElementById('batchOrderIds').value;

                if (!batchStatus) {
                    showToast('Veuillez sélectionner un statut', 'warning');
                    return;
                }

                if (!batchOrderIds) {
                    showToast('Aucune commande sélectionnée', 'warning');
                    return;
                }

                const selectedIds = batchOrderIds.split(',').filter(Boolean);

                // Envoyer la requête AJAX
                fetch(`${API_BASE_URL}/batch-update/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': CSRF_TOKEN
                    },
                    body: `order_ids=${encodeURIComponent(batchOrderIds)}&status=${batchStatus}&note=${encodeURIComponent(batchNote)}`
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Mettre à jour l'interface
                            selectedIds.forEach(id => {
                                updateRowStatus(id, batchStatus, getStatusText(batchStatus));
                            });

                            // Décocher toutes les cases
                            DOM.orderCheckboxes.forEach(checkbox => {
                                checkbox.checked = false;
                                const row = checkbox.closest('tr');
                                if (row) {
                                    row.classList.remove('selected');
                                }
                            });

                            // Mettre à jour l'état "Tout sélectionner"
                            if (DOM.selectAll) {
                                DOM.selectAll.checked = false;
                                DOM.selectAll.indeterminate = false;
                            }

                            // Masquer les actions groupées
                            updateBatchActions();

                            showToast(`${data.updated_count} commande(s) mise(s) à jour avec succès`, 'success');
                            closeModal(DOM.batchUpdateModal);
                        } else {
                            showToast(`Erreur: ${data.error}`, 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Erreur lors de la mise à jour groupée:', error);

                        // En cas d'erreur, faire quand même la mise à jour dans l'interface
                        selectedIds.forEach(id => {
                            updateRowStatus(id, batchStatus, getStatusText(batchStatus));
                        });

                        // Réinitialiser les sélections
                        DOM.orderCheckboxes.forEach(checkbox => {
                            checkbox.checked = false;
                            const row = checkbox.closest('tr');
                            if (row) {
                                row.classList.remove('selected');
                            }
                        });

                        if (DOM.selectAll) {
                            DOM.selectAll.checked = false;
                            DOM.selectAll.indeterminate = false;
                        }

                        updateBatchActions();

                        showToast('Commandes mises à jour localement', 'warning');
                        closeModal(DOM.batchUpdateModal);
                    });
            });
        }
    }

    // Fonctions utilitaires

    // Formater un prix
    function formatPrice(price) {
        if (price === null || price === undefined || isNaN(price)) return '0,00 F CFA';

        // Convertir en nombre si c'est une chaîne
        const numPrice = typeof price === 'string' ? parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.')) : price;

        return numPrice.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' F CFA';
    }

    // Formater une date
    function formatDate(date) {
        if (!date) return '';

        if (typeof date === 'string') {
            // Si c'est déjà formaté, le retourner tel quel
            if (/\d{1,2}\s[A-Za-zéûôîê]{3,}\s\d{4}/.test(date)) {
                return date;
            }

            date = new Date(date);
        }

        // Si la date est invalide
        if (isNaN(date.getTime())) return '';

        const day = date.getDate();
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day} ${month} ${year} ${hours}:${minutes}`;
    }

    // Ajouter des jours à une date
    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    // Fonction de debounce pour limiter les appels
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Afficher un toast de notification
    function showToast(message, type = 'info', duration = 3000) {
        // Chercher un conteneur de toast existant ou en créer un
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Créer le toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Déterminer l'icône en fonction du type
        let icon;
        switch (type) {
            case 'success':
                icon = 'fa-check-circle';
                break;
            case 'error':
                icon = 'fa-times-circle';
                break;
            case 'warning':
                icon = 'fa-exclamation-triangle';
                break;
            default:
                icon = 'fa-info-circle';
        }

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        // Ajouter le toast au conteneur
        container.appendChild(toast);

        // Animer l'entrée du toast
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Supprimer le toast après un délai
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';

            setTimeout(() => {
                toast.remove();

                // Si c'est le dernier toast, supprimer le conteneur
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);
    }
});