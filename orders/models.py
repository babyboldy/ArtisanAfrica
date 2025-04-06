from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from decimal import Decimal
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.urls import reverse

# Utilisez settings.AUTH_USER_MODEL au lieu de l'import direct
User = settings.AUTH_USER_MODEL

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('shipped', 'Expédiée'),
        ('delivered', 'Livrée'),
        ('cancelled', 'Annulée')
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('completed', 'Payée'),
        ('failed', 'Échouée'),
        ('refunded', 'Remboursée')
    ]

    PAYMENT_METHOD_CHOICES = [
        ('card', 'Carte bancaire'),
        ('paypal', 'PayPal'),
        ('transfer', 'Virement bancaire'),
        ('cash', 'Espèces'),
        ('delivery', 'Paiement à la livraison')
    ]

    # Informations principales
    order_number = models.CharField(max_length=50, unique=True, verbose_name=_("Numéro de commande"))
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', verbose_name=_("Client"))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name=_("Statut"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de création"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Date de mise à jour"))

    # Montants
    subtotal = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name=_("Sous-total")
    )
    shipping_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name=_("Frais de livraison")
    )
    tax_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name=_("Montant TVA")
    )
    total_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name=_("Montant total")
    )

    # Paiement
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='pending',
        verbose_name=_("Statut du paiement")
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES,
        verbose_name=_("Méthode de paiement")
    )
    payment_details = models.JSONField(null=True, blank=True, verbose_name=_("Détails du paiement"))
    payment_date = models.DateTimeField(null=True, blank=True, verbose_name=_("Date du paiement"))

    # Adresses en texte pour commencer
    shipping_address_text = models.TextField(verbose_name=_("Adresse de livraison"))
    billing_address_text = models.TextField(verbose_name=_("Adresse de facturation"))

    # Métadonnées
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name=_("Adresse IP"))
    user_agent = models.TextField(null=True, blank=True, verbose_name=_("User Agent"))
    tracking_number = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        verbose_name=_("Numéro de suivi")
    )
    estimated_delivery_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name=_("Date de livraison estimée")
    )
    email_sent = models.BooleanField(default=False, verbose_name=_("Email envoyé"))

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Commande")
        verbose_name_plural = _("Commandes")
        indexes = [
            models.Index(fields=['status']),  # Ajout d'index pour améliorer les performances du filtre
            models.Index(fields=['payment_status']),
            models.Index(fields=['customer']),
            models.Index(fields=['created_at']),
            models.Index(fields=['order_number']),
        ]

    def __str__(self):
        return f"Commande #{self.order_number}"

    def save(self, *args, **kwargs):
        if not self.total_amount:
            self.total_amount = self.subtotal + self.shipping_cost + self.tax_amount
        super().save(*args, **kwargs)

    def get_order_items(self):
        return self.items.all()
    
    def get_invoice_url(self):
        return reverse('generate_invoice', args=[self.id])
    
    def get_absolute_url(self):
        return reverse('client_order_detail', args=[self.id])
    
    def get_admin_detail_url(self):
        return reverse('admin_order_detail', args=[self.id])
    
    def is_paid(self):
        return self.payment_status == 'completed'
    
    def is_payment_at_delivery(self):
        return self.payment_method == 'delivery'

    def get_payment_display(self):
        if self.payment_method == 'delivery':
            return 'Paiement à la livraison'
        else:
            return 'Paiement en ligne'
    
    def can_cancel(self):
        return self.status in ['pending', 'processing']
    
    def add_note(self, user, note_text, attachment=None):
        return OrderNote.objects.create(
            order=self,
            user=user,
            note=note_text,
            attachment=attachment
        )
    
    def update_tracking(self, tracking_number):
        self.tracking_number = tracking_number
        self.save(update_fields=['tracking_number', 'updated_at'])
        return True
    
    def update_status(self, new_status, user=None, note=None):
        """Méthode pour mettre à jour le statut de la commande avec une note optionnelle"""
        if new_status not in dict(self.STATUS_CHOICES):
            return False
            
        old_status = self.status
        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])
        
        # Ajouter une note si un utilisateur est fourni
        if user and (note or old_status != new_status):
            note_text = note or f"Statut modifié de {dict(self.STATUS_CHOICES)[old_status]} à {dict(self.STATUS_CHOICES)[new_status]}"
            self.add_note(user, note_text)
            
        return True


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey('products.Product', null=True, blank=True, on_delete=models.SET_NULL, related_name='order_items')
    product_image = models.CharField(max_length=255, blank=True, null=True)
    product_name = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=100, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    options = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        verbose_name = "Élément de commande"
        verbose_name_plural = "Éléments de commande"
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['product']),
        ]
    
    def __str__(self):
        return f"{self.quantity} x {self.product_name}"
        
    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        if not self.total_price:
            self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class OrderNote(models.Model):
    order = models.ForeignKey(
        Order, 
        on_delete=models.CASCADE, 
        related_name='notes',
        verbose_name=_("Commande")
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        verbose_name=_("Utilisateur")
    )
    note = models.TextField(verbose_name=_("Note"))
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Date de création")
    )
    attachment = models.FileField(
        upload_to='order_notes/',
        null=True, 
        blank=True,
        verbose_name=_("Pièce jointe")
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = _("Note de commande")
        verbose_name_plural = _("Notes de commande")
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['created_at']),
        ]
        
    def __str__(self):
        return f"Note sur {self.order} par {self.user or 'système'}"