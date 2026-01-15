from django.db import models
from django.utils.translation import gettext_lazy as _

class TeamMember(models.Model):
    """Modèle pour les membres de l'équipe"""
    name = models.CharField(_("Nom"), max_length=100)
    position = models.CharField(_("Poste"), max_length=100)
    bio = models.TextField(_("Biographie"))
    image = models.ImageField(_("Photo"), upload_to='team/', blank=True, null=True)
    order = models.PositiveIntegerField(_("Ordre d'affichage"), default=0)
    is_active = models.BooleanField(_("Actif"), default=True)
    created_at = models.DateTimeField(_("Date de création"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Date de mise à jour"), auto_now=True)
    
    class Meta:
        verbose_name = _("Membre de l'équipe")
        verbose_name_plural = _("Membres de l'équipe")
        ordering = ['order', 'name']
        
    def __str__(self):
        return self.name

class CompanyValue(models.Model):
    """Modèle pour les valeurs de l'entreprise"""
    title = models.CharField(_("Titre"), max_length=100)
    description = models.TextField(_("Description"))
    icon = models.CharField(_("Icône Font Awesome"), max_length=50, help_text="ex: fa-handshake")
    order = models.PositiveIntegerField(_("Ordre d'affichage"), default=0)
    is_active = models.BooleanField(_("Actif"), default=True)
    
    class Meta:
        verbose_name = _("Valeur de l'entreprise")
        verbose_name_plural = _("Valeurs de l'entreprise")
        ordering = ['order', 'title']
        
    def __str__(self):
        return self.title

class Testimonial(models.Model):
    """Modèle pour les témoignages"""
    name = models.CharField(_("Nom"), max_length=100)
    title = models.CharField(_("Titre/Métier"), max_length=100)
    location = models.CharField(_("Lieu"), max_length=100)
    content = models.TextField(_("Témoignage"))
    image = models.ImageField(_("Photo"), upload_to='testimonials/', blank=True, null=True)
    is_active = models.BooleanField(_("Actif"), default=True)
    created_at = models.DateTimeField(_("Date de création"), auto_now_add=True)
    
    class Meta:
        verbose_name = _("Témoignage")
        verbose_name_plural = _("Témoignages")
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.name} - {self.title}"

class AboutContent(models.Model):
    """Modèle pour le contenu principal de la page À propos"""
    title = models.CharField(_("Titre"), max_length=200)
    subtitle = models.CharField(_("Sous-titre"), max_length=200)
    history_title = models.CharField(_("Titre Histoire"), max_length=100, default="Notre Histoire")
    history_content = models.TextField(_("Contenu Histoire"))
    mission_title = models.CharField(_("Titre Mission"), max_length=100, default="Notre Mission")
    mission_content = models.TextField(_("Contenu Mission"))
    process_title = models.CharField(_("Titre Processus"), max_length=100, default="Notre Processus de Sélection")
    team_title = models.CharField(_("Titre Équipe"), max_length=100, default="Notre Équipe")
    team_intro = models.TextField(_("Introduction Équipe"))
    cta_title = models.CharField(_("Titre CTA"), max_length=200)
    cta_content = models.TextField(_("Contenu CTA"))
    
    class Meta:
        verbose_name = _("Contenu À propos")
        verbose_name_plural = _("Contenus À propos")
        
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        # Assurez-vous qu'il n'y a qu'une seule instance de ce modèle
        if AboutContent.objects.exists() and not self.pk:
            # Si vous essayez de créer une nouvelle instance alors qu'une existe déjà
            return
        super().save(*args, **kwargs)

class ProcessStep(models.Model):
    """Modèle pour les étapes du processus"""
    title = models.CharField(_("Titre"), max_length=100)
    description = models.TextField(_("Description"))
    order = models.PositiveIntegerField(_("Ordre d'affichage"), default=0)
    is_active = models.BooleanField(_("Actif"), default=True)
    
    class Meta:
        verbose_name = _("Étape du processus")
        verbose_name_plural = _("Étapes du processus")
        ordering = ['order']
        
    def __str__(self):
        return self.title
