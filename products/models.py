from django.db import models
from django.utils import timezone

class Category(models.Model):
    # Your existing Category model code
    name = models.CharField(max_length=255, unique=True, verbose_name="Nom de la catégorie")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    icon = models.CharField(max_length=100, verbose_name="Icône FontAwesome")
    color = models.CharField(max_length=7, default="#6b21a8", verbose_name="Couleur")
    featured = models.BooleanField(default=False, verbose_name="Mise en avant")
    image = models.ImageField(upload_to='categories/', blank=True, null=True, verbose_name="Image de la catégorie")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="products", verbose_name="Catégorie")
    name = models.CharField(max_length=255, unique=True, verbose_name="Nom du produit")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Prix")
    stock = models.IntegerField(default=0, verbose_name="Stock")
    sku = models.CharField(max_length=100, unique=True, verbose_name="SKU", blank=True, null=True)
    barcode = models.CharField(max_length=100, unique=True, verbose_name="Code-barres", blank=True, null=True)
    weight = models.DecimalField(max_digits=6, decimal_places=2, verbose_name="Poids (kg)", blank=True, null=True)
    
    status_choices = [
        ('active', 'Actif'),
        ('draft', 'Brouillon'),
        ('archived', 'Archivé'),
    ]
    
    status = models.CharField(max_length=10, choices=status_choices, default='active', verbose_name="Statut")
    featured = models.BooleanField(default=False, verbose_name="Produit mis en avant")
    
    # Add timestamp fields with defaults for existing records
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de mise à jour")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"

    def save(self, *args, **kwargs):
        # If this is a new product (no ID yet), set created_at to now
        if not self.id:
            self.created_at = timezone.now()
        super().save(*args, **kwargs)

class ProductMedia(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media", verbose_name="Produit")
    media_type_choices = [
        ('image', 'Image'),
        ('video', 'Vidéo'),
    ]
    media_type = models.CharField(max_length=10, choices=media_type_choices, verbose_name="Type de média")
    file = models.FileField(upload_to='products/media/', verbose_name="Fichier média")

    def __str__(self):
        return f"{self.product.name} - {self.media_type}"

    class Meta:
        verbose_name = "Média du produit"
        verbose_name_plural = "Médias des produits"