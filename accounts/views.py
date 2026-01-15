from datetime import timedelta
import os
import uuid
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from accounts.models import User, UserAddress
from django.http import JsonResponse
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.urls import reverse
from django.contrib.auth.hashers import make_password


def register_page(request):
    if request.method == "POST":
        try:
            # Récupération des données de base
            first_name = request.POST.get("first_name")
            last_name = request.POST.get("last_name")
            email = request.POST.get("email")
            phone = request.POST.get("phone")
            password = request.POST.get("password")
            confirm_password = request.POST.get("confirm_password")
            
            # Vérification des champs obligatoires
            if not all([first_name, last_name, email, password, confirm_password]):
                messages.error(request, "Les champs marqués d'un * sont obligatoires.")
                return redirect("register")

            if password != confirm_password:
                messages.error(request, "Les mots de passe ne correspondent pas.")
                return redirect("register")

            if User.objects.filter(email=email).exists():
                messages.error(request, "Cet email est déjà utilisé.")
                return redirect("register")

            # Création de l'utilisateur
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                user_type="CLIENT",
                phone=phone,
                account_status=True,  # Compte actif mais email non confirmé
                email_confirmed=False  # L'email doit être confirmé
            )

            # Champs optionnels
            if 'gender' in request.POST:
                user.gender = request.POST.get('gender')
            if 'birth_date' in request.POST:
                user.birth_date = request.POST.get('birth_date')
            if 'company_name' in request.POST:
                user.company_name = request.POST.get('company_name')
            if 'profession' in request.POST:
                user.profession = request.POST.get('profession')
            if 'profile_picture' in request.FILES:
                user.profile_picture = request.FILES['profile_picture']

            # Génération du token de confirmation
            user.email_confirmation_token = uuid.uuid4().hex
            user.save()

            # Création de l'adresse si fournie
            street_address = request.POST.get('street_address')
            city = request.POST.get('city')
            postal_code = request.POST.get('postal_code')
            country = request.POST.get('country')

            if all([street_address, city, postal_code, country]):
                UserAddress.objects.create(
                    user=user,
                    address_type='BOTH',
                    street_address=street_address,
                    city=city,
                    postal_code=postal_code,
                    country=country,
                    apartment=request.POST.get('apartment', ''),
                    is_default=True
                )

            # Envoi de l'email de confirmation
            confirmation_link = request.build_absolute_uri(
                reverse('confirm_email', kwargs={'token': user.email_confirmation_token})
            )
            
            # Utilisation d'un template HTML pour l'email
            html_message = render_to_string('website/emails/email_confirmation.html', {
                'user': user,
                'confirmation_link': confirmation_link
            })
            
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject='Confirmez votre adresse email',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

            messages.success(request, "Inscription réussie. Un email de confirmation a été envoyé. Veuillez confirmer votre compte pour vous connecter.")
            return redirect("login")

        except Exception as e:
            messages.error(request, f"Erreur lors de l'inscription : {str(e)}")
            return redirect("register")

    return render(request, "register.html")


def confirm_email(request, token):
    try:
        user = User.objects.get(email_confirmation_token=token)
        
        if not user.email_confirmed:
            user.email_confirmed = True
            user.email_confirmation_token = None  # Effacer le token après utilisation
            user.save()
            
            messages.success(request, "Votre adresse email a été confirmée avec succès. Vous pouvez maintenant vous connecter.")
        else:
            messages.info(request, "Cette adresse email a déjà été confirmée.")
            
        return redirect("login")
    except User.DoesNotExist:
        messages.error(request, "Lien de confirmation invalide ou expiré.")
        return redirect("register")


def login_page(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")

        if not email or not password:
            messages.error(request, "Veuillez entrer un email et un mot de passe.")
            return redirect("login")

        user = authenticate(request, email=email, password=password)
        if user is not None:
            if not user.account_status:
                messages.error(request, "Votre compte a été désactivé. Contactez l'administrateur.")
                return redirect("login")
                
            if not user.email_confirmed:
                messages.error(request, "Votre adresse email n'a pas encore été confirmée. Veuillez vérifier votre email et cliquer sur le lien de confirmation.")
                return redirect("login")

            login(request, user)
            messages.success(request, "Connexion réussie !")

            # Redirection en fonction du rôle
            if user.is_super_admin:
                return redirect("admin_dashboard")
            elif user.is_admin:
                return redirect("admin_dashboard")
            else:
                return redirect("home")
        else:
            messages.error(request, "Identifiants incorrects.")
            return redirect("login")

    return render(request, "login.html")



@login_required
def logout_user(request):
    logout(request)
    messages.success(request, "Vous avez été déconnecté.")
    return redirect("login")



@login_required
def admin_customers(request):
    if not (request.user.is_admin or request.user.is_super_admin):
        messages.error(request, "Accès non autorisé.")
        return redirect('home')

    # Filtres
    search_query = request.GET.get('search', '')
    status_filter = request.GET.get('status', '')

    # Base queryset
    customers = User.objects.filter(user_type='CLIENT')

    # Appliquer les filtres
    if search_query:
        customers = customers.filter(
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(email__icontains=search_query)
        )

    if status_filter:
        customers = customers.filter(account_status=status_filter == 'active')

    # Gérer le blocage/déblocage
    if request.method == 'POST':
        customer_id = request.POST.get('customer_id')
        action = request.POST.get('action')
        
        if customer_id and action in ['block', 'unblock']:
            try:
                customer = customers.get(id=customer_id)
                customer.account_status = action == 'unblock'
                customer.save()
                messages.success(request, f"Client {'débloqué' if action == 'unblock' else 'bloqué'} avec succès.")
            except User.DoesNotExist:
                messages.error(request, "Client non trouvé.")
        
        return redirect('admin_customers')
    
    customer_count = customers.count()

    context = {
        'customer_count':customer_count,
        'customers': customers,
        'selected_status': status_filter
    }
    
    return render(request, 'dashboard/customer.html', context)




@login_required
def customer_detail(request, customer_id):
    if not request.user.is_admin and not request.user.is_super_admin:
        return JsonResponse({'error': 'Accès non autorisé'}, status=403)
    try:
        customer = get_object_or_404(User, id=customer_id, user_type='CLIENT')
        addresses = customer.addresses.all()

        data = {
            'id': customer.id,
            'full_name': customer.get_full_name(),
            'email': customer.email,
            'phone': customer.phone or None,
            'gender': customer.get_gender_display() if customer.gender else None,
            'birth_date': customer.birth_date.strftime('%d/%m/%Y') if customer.birth_date else None,
            'profile_picture': customer.profile_picture.url if customer.profile_picture else None,
            'total_orders': customer.total_orders,
            'total_spent': float(customer.total_spent),
            'last_order_date': customer.last_order_date.strftime('%d/%m/%Y') if customer.last_order_date else None,
            'date_joined': customer.date_joined.strftime('%d/%m/%Y'),
            'account_status': customer.account_status,
            'addresses': [{
                'address_type': address.get_address_type_display(),
                'street_address': address.street_address,
                'apartment': address.apartment,
                'city': address.city,
                'postal_code': address.postal_code,
                'country': address.country,
                'is_default': address.is_default
            } for address in addresses]
        }

        return JsonResponse(data)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Client non trouvé'}, status=404)
    
    
from django.utils import timezone
# Vue pour la demande de réinitialisation de mot de passe
def forgot_password(request):
    if request.method == "POST":
        email = request.POST.get("email")
        
        if not email:
            messages.error(request, "Veuillez entrer une adresse e-mail.")
            return redirect("forgot_password")

        try:
            user = User.objects.get(email=email)
            # Génération d'un jeton unique
            user.password_reset_token = uuid.uuid4().hex
            # Définir une expiration (par exemple, 1 heure)
            user.password_reset_expires = timezone.now() + timedelta(hours=1)
            user.save()

            # Créer un lien de réinitialisation
            reset_link = request.build_absolute_uri(
                reverse('reset_password', kwargs={'token': user.password_reset_token})
            )

            # Rendre un template HTML pour l'e-mail
            html_message = render_to_string('website/emails/password_reset.html', {
                'user': user,
                'reset_link': reset_link
            })
            plain_message = strip_tags(html_message)

            # Envoyer l'e-mail
            send_mail(
                subject='Réinitialisation de votre mot de passe',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

            messages.success(request, "Un lien de réinitialisation a été envoyé à votre adresse e-mail.")
            return redirect("login")

        except User.DoesNotExist:
            messages.error(request, "Aucun utilisateur n'est associé à cette adresse e-mail.")
            return redirect("forgot_password")

    return render(request, "forgot_password.html")

# Vue pour réinitialiser le mot de passe
def reset_password(request, token):
    try:
        user = User.objects.get(password_reset_token=token)

        # Vérifier si le jeton est expiré
        if user.password_reset_expires < timezone.now():
            messages.error(request, "Le lien de réinitialisation a expiré. Veuillez faire une nouvelle demande.")
            user.password_reset_token = None
            user.password_reset_expires = None
            user.save()
            return redirect("forgot_password")

        if request.method == "POST":
            password = request.POST.get("password")
            confirm_password = request.POST.get("confirm_password")

            if not password or not confirm_password:
                messages.error(request, "Veuillez entrer un mot de passe et le confirmer.")
                return redirect("reset_password", token=token)

            if password != confirm_password:
                messages.error(request, "Les mots de passe ne correspondent pas.")
                return redirect("reset_password", token=token)

            # Mettre à jour le mot de passe
            user.password = make_password(password)
            user.password_reset_token = None
            user.password_reset_expires = None
            user.save()

            messages.success(request, "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.")
            return redirect("login")

        return render(request, "reset_password.html", {'token': token})

    except User.DoesNotExist:
        messages.error(request, "Lien de réinitialisation invalide ou expiré.")
        return redirect("forgot_password")