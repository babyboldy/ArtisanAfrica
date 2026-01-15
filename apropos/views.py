from django.shortcuts import render
from django.views.generic import TemplateView
from .models import TeamMember, CompanyValue, Testimonial, AboutContent, ProcessStep


# Option 1: Vue basée sur une fonction
def about_view(request):
    """Vue pour la page À propos avec contenu dynamique"""
    about_content = AboutContent.objects.first()
    team_members = TeamMember.objects.filter(is_active=True)
    company_values = CompanyValue.objects.filter(is_active=True)
    testimonials = Testimonial.objects.filter(is_active=True)
    process_steps = ProcessStep.objects.filter(is_active=True)
    
    context = {
        'about_content': about_content,
        'team_members': team_members,
        'company_values': company_values,
        'testimonials': testimonials,
        'process_steps': process_steps,
    }
    
    return render(request, 'website/apropos.html', context)

# Option 2: Vue basée sur une classe (plus moderne et recommandée)
class AboutView(TemplateView):
    """Vue pour la page À propos utilisant les modèles pour un contenu dynamique"""
    template_name = 'apropos.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Récupération des données depuis les modèles
        context['about_content'] = AboutContent.objects.first()
        context['team_members'] = TeamMember.objects.filter(is_active=True)
        context['company_values'] = CompanyValue.objects.filter(is_active=True)
        context['testimonials'] = Testimonial.objects.filter(is_active=True)
        context['process_steps'] = ProcessStep.objects.filter(is_active=True)
        
        return context