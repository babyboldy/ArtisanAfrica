from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import EmailValidator
from django.utils import timezone
from django.db.models import Sum
from datetime import datetime

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('L\'adresse email est obligatoire'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('user_type', 'SUPER_ADMIN')

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Le superuser doit avoir is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Le superuser doit avoir is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    USER_TYPE_CHOICES = [
        ('SUPER_ADMIN', 'Super Administrateur'),
        ('ADMIN', 'Administrateur'),
        ('CLIENT', 'Client'),
    ]

    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
        ('O', 'Autre')
    ]

    # Champs de base
    username = None
    email = models.EmailField(_('Adresse email'), unique=True, validators=[EmailValidator()])
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='CLIENT')
    
    # Informations personnelles
    first_name = models.CharField(_('Prénom'), max_length=50)
    last_name = models.CharField(_('Nom'), max_length=50)
    gender = models.CharField(_('Genre'), max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    birth_date = models.DateField(_('Date de naissance'), blank=True, null=True)
    profile_picture = models.ImageField(_('Photo de profil'), upload_to='profile_pictures/', blank=True, null=True)
    phone = models.CharField(_('Téléphone'), max_length=20, blank=True, null=True)
    
    # Informations professionnelles
    company_name = models.CharField(_('Nom de l\'entreprise'), max_length=100, blank=True, null=True)
    profession = models.CharField(_('Profession'), max_length=100, blank=True, null=True)
    
    # Statistiques et métadonnées
    total_orders = models.IntegerField(_('Nombre total de commandes'), default=0)
    total_spent = models.DecimalField(_('Montant total dépensé'), max_digits=10, decimal_places=2, default=0)
    last_order_date = models.DateTimeField(_('Date de dernière commande'), blank=True, null=True)
    account_status = models.BooleanField(_('Compte actif'), default=True)
    
    # Dates importantes
    date_joined = models.DateTimeField(_('Date d\'inscription'), default=timezone.now)
    last_login = models.DateTimeField(_('Dernière connexion'), blank=True, null=True)
    
    # Relations
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                 related_name='created_users', verbose_name=_('Créé par'))
    
    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = _('Utilisateur')
        verbose_name_plural = _('Utilisateurs')
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_admin(self):
        return self.user_type == 'ADMIN'

    @property
    def is_super_admin(self):
        return self.user_type == 'SUPER_ADMIN'

    def get_managed_users(self):
        if self.is_super_admin:
            return User.objects.all().exclude(id=self.id)
        elif self.is_admin:
            return User.objects.filter(created_by=self, user_type='CLIENT')
        return User.objects.none()

    def get_monthly_spending(self, year=None, month=None):
        if year is None:
            year = datetime.now().year
        if month is None:
            month = datetime.now().month
        
        return self.orders.filter(
            created_at__year=year,
            created_at__month=month,
            status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or 0
    

    @property
    def profile_picture_url(self):
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            return self.profile_picture.url
        return '/static/images/default-avatar.png'
    
    

class UserAddress(models.Model):
    ADDRESS_TYPES = [
        ('BILLING', 'Facturation'),
        ('SHIPPING', 'Livraison'),
        ('BOTH', 'Facturation et Livraison')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(_('Type d\'adresse'), max_length=20, choices=ADDRESS_TYPES)
    street_address = models.CharField(_('Adresse'), max_length=255)
    apartment = models.CharField(_('Appartement/Suite'), max_length=50, blank=True, null=True)
    city = models.CharField(_('Ville'), max_length=100)
    state = models.CharField(_('État/Région'), max_length=100, blank=True, null=True)
    postal_code = models.CharField(_('Code postal'), max_length=20)
    country = models.CharField(_('Pays'), max_length=100)
    is_default = models.BooleanField(_('Adresse par défaut'), default=False)
    
    class Meta:
        verbose_name = _('Adresse')
        verbose_name_plural = _('Adresses')
        ordering = ['-is_default', 'id']

    def __str__(self):
        return f"{self.get_address_type_display()} - {self.street_address}, {self.city}"

    def save(self, *args, **kwargs):
        if self.is_default:
            # S'assurer qu'il n'y a qu'une seule adresse par défaut par type
            UserAddress.objects.filter(
                user=self.user,
                address_type=self.address_type,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)