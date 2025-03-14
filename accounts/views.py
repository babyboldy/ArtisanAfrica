import os
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from accounts.models import User, UserAddress
from django.http import JsonResponse
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


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
                phone=phone
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

            messages.success(request, "Inscription réussie. Connectez-vous maintenant.")
            return redirect("login")

        except Exception as e:
            messages.error(request, f"Erreur lors de l'inscription : {str(e)}")
            return redirect("register")

    return render(request, "register.html")


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