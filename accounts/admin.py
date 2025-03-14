from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import User, UserAddress

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'full_name', 'user_type', 'phone', 'company_name', 
                   'total_orders', 'total_spent', 'profile_picture_preview', 'is_active')
    list_filter = ('user_type', 'is_active', 'date_joined', 'last_login', 'account_status')
    search_fields = ('email', 'first_name', 'last_name', 'phone', 'company_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Informations personnelles'), {
            'fields': ('first_name', 'last_name', 'gender', 'birth_date', 
                      'profile_picture', 'phone')
        }),
        (_('Informations professionnelles'), {
            'fields': ('company_name', 'profession')
        }),
        (_('Permissions'), {
            'fields': ('user_type', 'is_active', 'is_staff', 'is_superuser', 
                      'groups', 'user_permissions'),
        }),
        (_('Statistiques'), {
            'fields': ('total_orders', 'total_spent', 'last_order_date')
        }),
        (_('Dates importantes'), {
            'fields': ('date_joined', 'last_login')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 
                      'user_type', 'is_active'),
        }),
    )

    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = _('Nom complet')

    def profile_picture_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<img src="{}" width="50" height="50" style="border-radius: 50%;" />',
                obj.profile_picture.url
            )
        return "-"
    profile_picture_preview.short_description = _('Photo')

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(super().get_readonly_fields(request, obj))
        if obj:  # Lors de l'édition
            readonly_fields.extend(['total_orders', 'total_spent', 'last_order_date'])
        return readonly_fields

@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'address_type', 'city', 'postal_code', 'country', 'is_default')
    list_filter = ('address_type', 'country', 'city', 'is_default')
    search_fields = ('user__email', 'street_address', 'city', 'postal_code', 'country')
    raw_id_fields = ('user',)
    
    fieldsets = (
        (None, {
            'fields': ('user', 'address_type', 'is_default')
        }),
        (_('Adresse'), {
            'fields': ('street_address', 'apartment', 'city', 'state', 'postal_code', 'country')
        }),
    )

    def save_model(self, request, obj, form, change):
        if obj.is_default:
            # S'assurer qu'il n'y a qu'une seule adresse par défaut par type pour l'utilisateur
            UserAddress.objects.filter(
                user=obj.user,
                address_type=obj.address_type,
                is_default=True
            ).exclude(id=obj.id).update(is_default=False)
        super().save_model(request, obj, form, change)

# Actions personnalisées
@admin.action(description=_('Activer les utilisateurs sélectionnés'))
def activate_users(modeladmin, request, queryset):
    queryset.update(is_active=True)

@admin.action(description=_('Désactiver les utilisateurs sélectionnés'))
def deactivate_users(modeladmin, request, queryset):
    queryset.update(is_active=False)

# Ajout des actions personnalisées
CustomUserAdmin.actions = [activate_users, deactivate_users]