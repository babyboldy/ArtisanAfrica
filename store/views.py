from pyexpat.errors import messages
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from products.models import Product, Category
import os
from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext_lazy as _
from accounts.models import User, UserAddress



# Create your views here.
def home_page(request):
    # Récupérer les 9 derniers produits mis en avant et actifs
    featured_products = Product.objects.filter(
        featured=True,
        status='active'
    ).order_by('-id')[:9]  # Limite aux 9 derniers produits
    
    # Récupérer toutes les catégories
    categories = Category.objects.all()
    
    context = {
        'featured_products': featured_products,
        'categories': categories,
    }
    
    return render(request, 'website/index.html', context)





@login_required
def client_profile(request):
    user = request.user
    
    # Traitement des formulaires
    if request.method == 'POST':
        action = request.POST.get('action', '')
        
        # Mise à jour des informations personnelles
        if action == 'update_info':
            # Informations de base
            user.first_name = request.POST.get('first_name', user.first_name)
            user.last_name = request.POST.get('last_name', user.last_name)
            user.email = request.POST.get('email', user.email)
            user.phone = request.POST.get('phone', user.phone)
            
            # Informations supplémentaires
            birth_date = request.POST.get('birth_date')
            if birth_date:
                user.birth_date = birth_date
            
            user.gender = request.POST.get('gender', user.gender)
            
            # Gestion de la photo de profil
            if 'profile_picture' in request.FILES:
                # Supprimer l'ancienne image si elle existe
                if user.profile_picture:
                    try:
                        if os.path.isfile(user.profile_picture.path):
                            os.remove(user.profile_picture.path)
                    except Exception as e:
                        pass  # Ignorer les erreurs si le fichier n'existe pas
                
                # Enregistrer la nouvelle image
                user.profile_picture = request.FILES['profile_picture']
            
            # Si l'utilisateur a demandé de supprimer sa photo
            if request.POST.get('remove_photo') == 'true':
                if user.profile_picture:
                    try:
                        if os.path.isfile(user.profile_picture.path):
                            os.remove(user.profile_picture.path)
                    except Exception as e:
                        pass
                user.profile_picture = None
            
            user.save()
            messages.success(request, _('Vos informations personnelles ont été mises à jour avec succès.'))
            return redirect('client_profile')
        
        # Changement de mot de passe
        elif action == 'change_password':
            current_password = request.POST.get('current_password')
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')
            
            if not user.check_password(current_password):
                messages.error(request, _('Le mot de passe actuel est incorrect.'))
            elif new_password != confirm_password:
                messages.error(request, _('Les nouveaux mots de passe ne correspondent pas.'))
            else:
                user.set_password(new_password)
                user.save()
                messages.success(request, _('Votre mot de passe a été changé avec succès.'))
                return redirect('client_profile')
    
    # Récupération des adresses de l'utilisateur
    user_addresses = UserAddress.objects.filter(user=user)
    
    # Récupération des commandes de l'utilisateur (à adapter selon votre modèle de commande)
    try:
        orders = user.orders.all().order_by('-created_at')
    except:
        orders = []
    
    # Contexte pour le template
    context = {
        'user': user,
        'user_addresses': user_addresses,
        'orders': orders,
        'gender_choices': User.GENDER_CHOICES,
        'address_types': UserAddress.ADDRESS_TYPES,
    }
    
    return render(request, 'website/profile.html', context)




@login_required
def client_profile_address(request):
    user = request.user
    
    if request.method == 'POST':
        address_id = request.POST.get('address_id')
        address_type = request.POST.get('address_type')
        street_address = request.POST.get('street_address')
        apartment = request.POST.get('apartment')
        city = request.POST.get('city')
        postal_code = request.POST.get('postal_code')
        country = request.POST.get('country')
        is_default = request.POST.get('is_default') == 'on'
        
        if address_id:
            # Modification d'une adresse existante
            address = get_object_or_404(UserAddress, id=address_id, user=user)
            address.address_type = address_type
            address.street_address = street_address
            address.apartment = apartment
            address.city = city
            address.postal_code = postal_code
            address.country = country
            address.is_default = is_default
            address.save()
            messages.success(request, _('Adresse mise à jour avec succès.'))
        else:
            # Création d'une nouvelle adresse
            address = UserAddress(
                user=user,
                address_type=address_type,
                street_address=street_address,
                apartment=apartment,
                city=city,
                postal_code=postal_code,
                country=country,
                is_default=is_default
            )
            address.save()
            messages.success(request, _('Adresse ajoutée avec succès.'))
        
    return redirect('client_profile')






@login_required
def client_delete_address(request, address_id=None):
    if request.method == 'POST':
        address_id = request.POST.get('address_id', address_id)
        if address_id:
            address = get_object_or_404(UserAddress, id=address_id, user=request.user)
            address.delete()
            messages.success(request, _('Adresse supprimée avec succès.'))
        else:
            messages.error(request, _('Adresse introuvable.'))
    return redirect('client_profile')