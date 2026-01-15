// Effet d'apparition au défilement
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter la classe fade-in-section à tous les éléments qui doivent apparaître au défilement
    const aboutSections = document.querySelectorAll('.about-section');
    aboutSections.forEach(section => {
        section.classList.add('fade-in-section');
    });

    // Vérifier si les éléments sont visibles lors du défilement
    function checkVisibility() {
        const fadeSections = document.querySelectorAll('.fade-in-section');
        fadeSections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            // Si la section est visible dans la fenêtre
            if (sectionTop < windowHeight - 100) {
                section.classList.add('is-visible');
            }
        });
    }

    // Vérifier la visibilité au chargement initial
    checkVisibility();
    
    // Vérifier la visibilité lors du défilement
    window.addEventListener('scroll', checkVisibility);

    // Animation des témoignages
    const testimonials = document.querySelectorAll('.testimonial');
    let currentTestimonial = 0;
    
    // Si des témoignages existent sur la page
    if (testimonials.length > 0) {
        // Fonction pour alterner entre les témoignages
        function showNextTestimonial() {
            testimonials.forEach((testimonial, index) => {
                if (index === currentTestimonial) {
                    testimonial.style.opacity = 1;
                    testimonial.style.transform = 'translateY(0)';
                } else {
                    testimonial.style.opacity = 0.5;
                    testimonial.style.transform = 'translateY(10px)';
                }
            });
            
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        }
        
        // Animation initiale
        showNextTestimonial();
        
        // Animation toutes les 5 secondes
        // Commenté pour une meilleure expérience utilisateur - décommentez si besoin
        // setInterval(showNextTestimonial, 5000);
    }
    
    // Animation subtile au survol des valeurs
    const valueCards = document.querySelectorAll('.value-card');
    valueCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Appliquer un léger effet de rebond
            card.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            card.style.transition = 'transform 0.4s ease';
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Animation d'apparition du CTA
    const ctaSection = document.querySelector('.cta-section');
    if (ctaSection) {
        ctaSection.classList.add('fade-in-section');
    }
});