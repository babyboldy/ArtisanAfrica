// notifications.js


document.addEventListener('DOMContentLoaded', function() {
    // Gestion des menus contextuels
    document.addEventListener('click', function(e) {
        // Ferme tous les menus contextuels ouverts
        const triggers = document.querySelectorAll('.menu-trigger');
        triggers.forEach(trigger => {
            if (!trigger.contains(e.target)) {
                const dropdown = trigger.nextElementSibling;
                if (dropdown && dropdown.classList.contains('dropdown-menu')) {
                    dropdown.style.display = 'none';
                }
            }
        });
        
        // Ouvre/ferme le menu du trigger cliqué
        const trigger = e.target.closest('.menu-trigger');
        if (trigger) {
            const dropdown = trigger.nextElementSibling;
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
            e.stopPropagation();
        }
    });
    
    // Gestion de la modal de confirmation (utilisée pour les confirmations JS)
    const modal = document.getElementById('confirmModal');
    if (modal) {
        // Fermer la modal quand on clique sur X ou Annuler
        const closeButtons = modal.querySelectorAll('.close-modal, [data-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        });

        // Fermer la modal quand on clique en dehors
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// Fonction pour afficher des toasts de confirmation (après les redirections)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                       <span>${message}</span>`;
    
    const container = document.querySelector('.toast-container') ||
        (function() {
            const c = document.createElement('div');
            c.className = 'toast-container';
            document.body.appendChild(c);
            return c;
        })();
    
    container.appendChild(toast);
    
    // Disparaît après 3 secondes
    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
            container.remove();
        }
    }, 3000);
}

// Afficher les toasts pour les messages Django (si nécessaire)
document.addEventListener('DOMContentLoaded', function() {
    const alertElements = document.querySelectorAll('.alert');
    alertElements.forEach(alert => {
        const message = alert.textContent.trim();
        const type = alert.classList.contains('alert-success') ? 'success' : 
                    alert.classList.contains('alert-danger') ? 'error' :
                    alert.classList.contains('alert-warning') ? 'warning' : 'info';
        
        showToast(message, type);
        
        // Optionnel : supprime les alertes après les avoir converties en toasts
        // alert.remove();
    });
});