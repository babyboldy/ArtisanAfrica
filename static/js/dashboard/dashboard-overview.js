document.addEventListener('DOMContentLoaded', function() {
    initSalesChart();
    initCategoriesChart();
    initEventListeners();
    animateStatCards();

    // 🎯 Fonction pour initialiser le graphique des ventes
    function initSalesChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');

        const salesData = {
            labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
            datasets: [{
                label: 'Ventes',
                data: [1500, 2300, 1800, 2800, 2100, 2900, 3100],
                borderColor: '#6b21a8',
                backgroundColor: 'rgba(107, 33, 168, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6b21a8'
            }]
        };

        const salesChart = new Chart(ctx, {
            type: 'line',
            data: salesData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'white',
                        titleColor: '#111',
                        bodyColor: '#666',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' €';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { callback: (value) => value + ' €' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        // 🏆 Gestion du filtrage des ventes par période
        document.querySelectorAll('.chart-action').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelectorAll('.chart-action').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                updateChartData(salesChart, this.textContent.toLowerCase());
            });
        });
    }

    // 🎯 Fonction pour initialiser le graphique des ventes par catégorie
    function initCategoriesChart() {
        const ctx = document.getElementById('categoriesChart').getContext('2d');

        const categoriesData = {
            labels: ['Électronique', 'Mode', 'Maison', 'Sport', 'Beauté'],
            datasets: [{
                data: [35, 25, 20, 15, 5],
                backgroundColor: ['#6b21a8', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: categoriesData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // 📅 Mise à jour des données du graphique en fonction de la période sélectionnée
    function updateChartData(chart, period) {
        const data = {
            'jour': { labels: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'], data: [800, 1200, 1500, 1300, 1900, 2200, 1800] },
            'semaine': { labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], data: [1500, 2300, 1800, 2800, 2100, 2900, 3100] },
            'mois': { labels: ['1', '5', '10', '15', '20', '25', '30'], data: [5000, 7000, 6500, 8000, 7500, 9000, 9500] }
        };

        chart.data.labels = data[period].labels;
        chart.data.datasets[0].data = data[period].data;
        chart.update();
    }

    // 🚀 Initialisation des événements du tableau de bord
    function initEventListeners() {
        // 📅 Sélection de la plage de dates
        document.querySelector('.date-range-btn').addEventListener('click', function() {
            alert('Fonctionnalité de filtre par date en cours de développement.');
        });

        // 📌 Actions sur les commandes (voir, modifier, supprimer)
        document.querySelectorAll('.table-actions button').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.getAttribute('title').toLowerCase();
                const orderId = this.closest('tr').querySelector('td:first-child').textContent;
                handleTableAction(action, orderId);
            });
        });
    }

    // 🛠️ Gestion des actions des commandes
    function handleTableAction(action, orderId) {
        switch (action) {
            case 'voir':
                window.location.href = `order-details.html?id=${orderId}`;
                break;
            case 'modifier':
                showEditModal(orderId);
                break;
            case 'supprimer':
                confirmDelete(orderId);
                break;
        }
    }

    // ⚙️ Affichage du modal d'édition de commande
    function showEditModal(orderId) {
        alert(`Modification de la commande ${orderId} en cours...`);
    }

    // ❌ Confirmation de suppression d'une commande
    function confirmDelete(orderId) {
        if (confirm(`Voulez-vous vraiment supprimer la commande ${orderId} ?`)) {
            alert(`Commande ${orderId} supprimée.`);
        }
    }

    // 📊 Animation des cartes de statistiques
    function animateStatCards() {
        document.querySelectorAll('.stat-value').forEach(value => {
            const finalValue = parseInt(value.textContent.replace(/[^0-9]/g, ''));
            animateValue(value, 0, finalValue, 1500);
        });
    }

    // 🔄 Fonction d'animation des valeurs des statistiques
    function animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        function animate() {
            current += increment;
            if (current >= end) {
                element.textContent = end.toLocaleString();
            } else {
                element.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(animate);
            }
        }

        animate();
    }
});
