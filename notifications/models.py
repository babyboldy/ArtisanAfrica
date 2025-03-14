# notifications/models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from orders.models import Order

class Notification(models.Model):
    TYPE_CHOICES = [
        ('order', 'Commande'),
        ('stock', 'Stock'),
        ('system', 'Système')
    ]

    LEVEL_CHOICES = [
        ('info', 'Information'),
        ('success', 'Succès'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur')
    ]

    # Informations de base
    title = models.CharField(_('Titre'), max_length=255)
    message = models.TextField(_('Message'))
    type = models.CharField(_('Type'), max_length=20, choices=TYPE_CHOICES)
    level = models.CharField(_('Niveau'), max_length=20, choices=LEVEL_CHOICES, default='info')

    # Destinataire et état
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('Utilisateur')
    )
    is_read = models.BooleanField(_('Lu'), default=False)
    is_archived = models.BooleanField(_('Archivé'), default=False)

    # Données associées
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object_type = models.CharField(max_length=50, null=True, blank=True)
    action_url = models.CharField(_('URL d\'action'), max_length=255, null=True, blank=True)
    icon = models.CharField(_('Icône'), max_length=50, default='fas fa-bell')

    # Métadonnées
    created_at = models.DateTimeField(_('Date de création'), auto_now_add=True)
    read_at = models.DateTimeField(_('Date de lecture'), null=True, blank=True)
    archived_at = models.DateTimeField(_('Date d\'archivage'), null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['type', 'is_read']),
        ]

    def __str__(self):
        return f"{self.get_type_display()} - {self.title}"

    def mark_as_read(self):
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()

    def archive(self):
        from django.utils import timezone
        if not self.is_archived:
            self.is_archived = True
            self.archived_at = timezone.now()
            self.save()

    def get_related_object(self):
        if self.type == 'order' and self.related_object_id:
            try:
                return Order.objects.get(id=self.related_object_id)
            except Order.DoesNotExist:
                return None
        return None



class NotificationGroup(models.Model):
    title = models.CharField(_('Titre'), max_length=255)
    notifications = models.ManyToManyField(
        Notification,
        related_name='groups',
        verbose_name=_('Notifications')
    )
    created_at = models.DateTimeField(_('Date de création'), auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Groupe de notifications')
        verbose_name_plural = _('Groupes de notifications')

    def __str__(self):
        return self.title