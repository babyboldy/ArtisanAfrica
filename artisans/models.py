from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
# from django.contrib.auth.models import User

class Region(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class CraftType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Artisan(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=200)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)
    country = models.CharField(max_length=100)
    craft_type = models.ForeignKey(CraftType, on_delete=models.SET_NULL, null=True)
    description = models.TextField()
    image = models.ImageField(upload_to='artisans/', default='artisans/placeholder.jpg')
    rating = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(5.0)])
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class ArtisanApplication(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    )

    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    craft_type = models.ForeignKey(CraftType, on_delete=models.SET_NULL, null=True)
    other_craft = models.CharField(max_length=200, blank=True)
    experience = models.CharField(max_length=20)
    description = models.TextField()
    portfolio_url = models.URLField(blank=True)
    photos = models.ManyToManyField('ApplicationPhoto', blank=True)
    terms_accepted = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Candidature de {self.full_name}"

class ApplicationPhoto(models.Model):
    image = models.ImageField(upload_to='application_photos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo {self.id}"

class Testimonial(models.Model):
    artisan = models.ForeignKey(Artisan, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Témoignage de {self.artisan.name}"