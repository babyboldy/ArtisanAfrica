    document.getElementById('craft-type').addEventListener('change', function() {
        var otherCraftGroup = document.getElementById('other-craft-group');
        if (this.value === 'Autre') {
            otherCraftGroup.style.display = 'block';
        } else {
            otherCraftGroup.style.display = 'none';
        }
    });

    document.getElementById('artisan-application-form').addEventListener('submit', function(event) {
        event.preventDefault();
        document.getElementById('form-notification').style.display = 'block';
        // Ajoutez ici le code pour envoyer les données du formulaire au serveur
    });

    document.getElementById('close-notification').addEventListener('click', function() {
        document.getElementById('form-notification').style.display = 'none';
    });

    // Ajoutez ici les scripts spécifiques à la page artisans si nécessaire
