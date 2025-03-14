from django.db.models.signals import post_save
from django.dispatch import receiver
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from orders.models import Order
from .models import Notification
from django.contrib.auth import get_user_model

@receiver(post_save, sender=Order)
def create_order_notification(sender, instance, created, **kwargs):
    """
    Crée une notification lorsqu'une commande est créée ou modifiée
    """
    User = get_user_model()
    admin_users = User.objects.filter(is_staff=True)

    if created:
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                title=_('Nouvelle commande'),
                message=_(f'Une nouvelle commande #{instance.order_number} a été passée pour un montant de {instance.total_amount} €.'),
                type='order',
                level='success',
                related_object_id=instance.id,
                related_object_type='Order',
                action_url=reverse('payment_confirmation', args=[instance.order_number]),  # 🔥 Correction ici !
                icon='fas fa-shopping-bag'
            )

    elif instance.status == 'cancelled':
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                title=_('Commande annulée'),
                message=_(f'La commande #{instance.order_number} a été annulée.'),
                type='order',
                level='warning',
                related_object_id=instance.id,
                related_object_type='Order',
                action_url=reverse('payment_confirmation', args=[instance.order_number]),  # 🔥 Correction ici !
                icon='fas fa-times-circle'
            )
