// dashboard-overview.js - Tableaux de bord graphiques et statistiques

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si le graphique Chart.js est disponible
    if (typeof Chart === 'undefined') {
        console.error('Chart.js n\'est pas chargé.');
        return;
    }

    // Configuration des couleurs et thèmes
    const colors = {
        primary: '#6b21a8',
        primaryLight: 'rgba(107, 33, 168, 0.1)',
        secondary: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        dark: '#111827',
        gray: '#6b7280',
        lightGray: '#f1f5f9'
    };

    // Données des graphiques (depuis l'objet global ou utiliser des valeurs par défaut)
    const chartData = window.chartData || {
        dailySales: [
            {date: '8h', value: 800},
            {date: '10h', value: 1200},
            {date: '12h', value: 1500},
            {date: '14h', value: 1300},
            {date: '16h', value: 1900},
            {date: '18h', value: 2200},
            {date: '20h', value: 1800}
        ],
        weeklySales: [
            {date: 'Lun', value: 1500},
            {date: 'Mar', value: 2300},
            {date: 'Mer', value: 1800},
            {date: 'Jeu', value: 2800},
            {date: 'Ven', value: 2100},
            {date: 'Sam', value: 2900},
            {date: 'Dim', value: 3100}
        ],
        monthlySales: [
            {date: '1', value: 5000},
            {date: '5', value: 7000},
            {date: '10', value: 6500},
            {date: '15', value: 8000},
            {date: '20', value: 7500},
            {date: '25', value: 9000},
            {date: '30', value: 9500}
        ],
        categories: [
            {name: 'Électronique', value: 35, color: colors.primary},
            {name: 'Mode', value: 25, color: colors.secondary},
            {name: 'Maison', value: 20, color: colors.success},
            {name: 'Sport', value: 15, color: colors.warning},
            {name: 'Beauté', value: 5, color: colors.danger}
        ]
    };

    // Initialisation des fonctionnalités
    initSalesChart();
    initCategoriesChart();
    initEventListeners();
    animateStatCards();

    // Graphique d'évolution des ventes
    function initSalesChart() {
        const salesChartCanvas = document.getElementById('salesChart');
        if (!salesChartCanvas) return;

        const ctx = salesChartCanvas.getContext('2d');
        
        // Préparer les données
        const currentPeriodData = chartData.weeklySales;
        const labels = currentPeriodData.map(item => item.date);
        const values = currentPeriodData.map(item => item.value);

        // Configuration du graphique
        const salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventes',
                    data: values,
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: colors.primary,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: colors.primary,
                    pointBorderColor: 'white',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'white',
                        titleColor: colors.dark,
                        bodyColor: colors.gray,
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toLocaleString() + ' F CFA';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: colors.lightGray },
                        ticks: { 
                            callback: value => value.toLocaleString() + ' F CFA',
                            font: { size: 11 }
                        }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });

        // Gestion du filtrage des ventes par période
        document.querySelectorAll('.chart-action').forEach(button => {
            button.addEventListener('click', function() {
                // Mettre à jour l'apparence des boutons
                document.querySelectorAll('.chart-action').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Mettre à jour les données selon la période
                updateChartData(salesChart, this.dataset.period || this.textContent.toLowerCase());
            });
        });
    }

    // Graphique des ventes par catégorie
    function initCategoriesChart() {
        const categoriesChartCanvas = document.getElementById('categoriesChart');
        if (!categoriesChartCanvas) return;

        const ctx = categoriesChartCanvas.getContext('2d');
        
        // Préparer les données
        const labels = chartData.categories.map(item => item.name);
        const values = chartData.categories.map(item => item.value);
        const backgroundColors = chartData.categories.map(item => item.color);

        // Configuration du graphique
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            padding: 20, 
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${percentage}% (${value})`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // Mise à jour des données du graphique
    function updateChartData(chart, period) {
        let selectedData;
        
        switch(period) {
            case 'day':
            case 'jour':
                selectedData = chartData.dailySales;
                break;
            case 'month':
            case 'mois':
                selectedData = chartData.monthlySales;
                break;
            case 'week':
            case 'semaine':
            default:
                selectedData = chartData.weeklySales;
                break;
        }

        // Mettre à jour le graphique
        chart.data.labels = selectedData.map(item => item.date);
        chart.data.datasets[0].data = selectedData.map(item => item.value);
        chart.update();
    }

    // Gestion des événements UI
    function initEventListeners() {
        // Bouton de sélection de date
        const dateRangeBtn = document.querySelector('.date-range-btn');
        if (dateRangeBtn) {
            dateRangeBtn.addEventListener('click', function() {
                // Ici, on pourrait ouvrir un calendrier de sélection de date
                // Pour l'instant, on montre juste un message
                showToast('Fonctionnalité de filtre par date en cours de développement.', 'info');
            });
        }

        // Menus des cartes graphiques
        document.querySelectorAll('.chart-menu').forEach(menu => {
            menu.addEventListener('click', function() {
                // Afficher un menu contextuel ou des options supplémentaires
                const options = ['Exporter PNG', 'Exporter PDF', 'Voir les détails'];
                
                // Créer un menu déroulant temporaire
                const dropdown = document.createElement('div');
                dropdown.className = 'chart-dropdown';
                dropdown.style.position = 'absolute';
                dropdown.style.top = (this.offsetTop + this.offsetHeight) + 'px';
                dropdown.style.right = '15px';
                dropdown.style.background = 'white';
                dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                dropdown.style.borderRadius = '6px';
                dropdown.style.zIndex = '100';
                
                // Ajouter les options
                options.forEach(option => {
                    const item = document.createElement('div');
                    item.className = 'chart-dropdown-item';
                    item.textContent = option;
                    item.style.padding = '8px 16px';
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', () => {
                        showToast(`Action: ${option}`, 'info');
                        dropdown.remove();
                    });
                    item.addEventListener('mouseover', () => {
                        item.style.backgroundColor = '#f3f4f6';
                    });
                    item.addEventListener('mouseout', () => {
                        item.style.backgroundColor = 'white';
                    });
                    dropdown.appendChild(item);
                });
                
                // Ajouter le menu au DOM
                document.body.appendChild(dropdown);
                
                // Supprimer le menu au clic ailleurs
                const removeDropdown = (e) => {
                    if (!dropdown.contains(e.target) && e.target !== this) {
                        dropdown.remove();
                        document.removeEventListener('click', removeDropdown);
                    }
                };
                setTimeout(() => {
                    document.addEventListener('click', removeDropdown);
                }, 100);
            });
        });
    }

    // Animation des valeurs dans les cartes de statistiques
    function animateStatCards() {
        document.querySelectorAll('.stat-value').forEach(element => {
            // Extraire la valeur numérique
            const text = element.textContent;
            const value = parseInt(text.replace(/\D/g, ''));
            
            if (!isNaN(value) && value > 0) {
                // Animation progressive
                animateCounter(element, 0, value, 1500, text.includes('F CFA'));
            }
        });
    }

    // Animation des compteurs
    function animateCounter(element, start, end, duration, isCurrency = false) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        const format = num => {
            return isCurrency
                ? num.toLocaleString() + ' F CFA'
                : num.toLocaleString();
        };

        // Animation par frames
        const animate = () => {
            current += increment;
            if (current >= end) {
                element.textContent = format(end);
            } else {
                element.textContent = format(Math.floor(current));
                requestAnimationFrame(animate);
            }
        };

        animate();
    }
});