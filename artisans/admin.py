from django.contrib import admin

# Register your models here.
# artisans/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import path
from django.template.response import TemplateResponse
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from .models import Artisan, Region, CraftType, ArtisanApplication, ApplicationPhoto, Testimonial
from .views import update_application_status

# Modèle pour afficher les photos de candidature
class ApplicationPhotoInline(admin.TabularInline):
    model = ArtisanApplication.photos.through
    extra = 0
    readonly_fields = ['photo_preview']
    verbose_name = "Photo"
    verbose_name_plural = "Photos"
    
    def photo_preview(self, obj):
        return format_html('<img src="{}" style="max-height: 100px; max-width: 100px;" />', obj.applicationphoto.image.url)
    
    photo_preview.short_description = "Aperçu"
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(ArtisanApplication)
class ArtisanApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'country', 'display_craft_type', 'experience', 'status', 'submitted_at']
    list_filter = ['status', 'experience', 'country', 'submitted_at']
    search_fields = ['full_name', 'email', 'description']
    readonly_fields = ['full_name', 'email', 'phone', 'country', 'display_craft_type', 
                       'other_craft', 'experience', 'description', 'portfolio_url', 
                       'terms_accepted', 'submitted_at']
    fieldsets = [
        ('Informations personnelles', {
            'fields': ['full_name', 'email', 'phone', 'country']
        }),
        ('Informations professionnelles', {
            'fields': ['display_craft_type', 'other_craft', 'experience', 'description', 'portfolio_url']
        }),
        ('État de la candidature', {
            'fields': ['status', 'submitted_at', 'terms_accepted']
        }),
    ]
    inlines = [ApplicationPhotoInline]
    exclude = ['photos', 'craft_type']
    
    def display_craft_type(self, obj):
        if obj.craft_type:
            return obj.craft_type.name
        return f"Autre: {obj.other_craft}"
    
    display_craft_type.short_description = "Type d'artisanat"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<path:object_id>/change-status/', self.admin_site.admin_view(self.change_status_view), name='artisan-application-change-status'),
        ]
        return custom_urls + urls
    
    def change_status_view(self, request, object_id, *args, **kwargs):
        """Vue pour afficher un formulaire de changement de statut avec notification"""
        application = get_object_or_404(ArtisanApplication, id=object_id)
        
        if request.method == 'POST':
            new_status = request.POST.get('status')
            
            # Appeler la vue de mise à jour qui enverra aussi l'email
            return update_application_status(request, object_id)
        
        # Afficher le formulaire
        context = {
            'title': f'Changer le statut de la candidature: {application.full_name}',
            'application': application,
            'status_choices': ArtisanApplication.STATUS_CHOICES,
            'opts': self.model._meta,
            'app_label': self.model._meta.app_label,
        }
        return TemplateResponse(request, 'admin/artisans/artisanapplication/change_status.html', context)
    
    def change_view(self, request, object_id, form_url='', extra_context=None):
        """Ajouter un bouton pour changer le statut dans la vue de détail"""
        extra_context = extra_context or {}
        extra_context['show_status_button'] = True
        return super().change_view(request, object_id, form_url, extra_context)

# Enregistrer les autres modèles
admin.site.register(Artisan)
admin.site.register(Region)
admin.site.register(CraftType)
admin.site.register(ApplicationPhoto)
admin.site.register(Testimonial)