from django.db import models
from datetime import datetime

class Contact(models.Model):
    SUBJECT_CHOICES = [
        ('commande', 'Question sur ma commande'),
        ('produit', 'Information produit'),
        ('retour', 'Retour produit'),
        ('autre', 'Autre'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    message = models.TextField()
    privacy_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.subject}"


class Newsletter(models.Model):
    email = models.EmailField(unique=True)
    date_added = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.email


class StockAlert(models.Model):
    product_id = models.PositiveIntegerField()
    product_name = models.CharField(max_length=255)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['product_id', 'email']
        
    def __str__(self):
        return f"{self.email} - {self.product_name} (ID: {self.product_id})"
        
    def mark_as_notified(self):
        self.notified = True
        self.notified_at = datetime.now()
        self.save()