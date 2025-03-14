# views.py
from pyexpat.errors import messages
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta
from django.utils.translation import gettext_lazy as _
import json
import os



from accounts.models import User, UserAddress
from orders.models import Order, OrderItem
from products.models import Product, Category






# views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta
import json

from accounts.models import User
from orders.models import Order, OrderItem
from products.models import Product, Category

@login_required
def dashboard(request):
    # Default image SVG as data URI - no need for a file
    DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23f3f4f6'/%3E%3Cpath d='M20 15C18.3431 15 17 16.3431 17 18C17 19.6569 18.3431 21 20 21C21.6569 21 23 19.6569 23 18C23 16.3431 21.6569 15 20 15Z' fill='%23a1a1aa'/%3E%3Cpath d='M14 25.6C14 25.0399 14.3668 24.5397 14.8944 24.3526C16.8738 23.6925 18.4426 23.3333 20 23.3333C21.5574 23.3333 23.1262 23.6925 25.1056 24.3526C25.6332 24.5397 26 25.0399 26 25.6V26.6667H14V25.6Z' fill='%23a1a1aa'/%3E%3Cpath d='M10 6.66667C8.15905 6.66667 6.66667 8.15905 6.66667 10V30C6.66667 31.841 8.15905 33.3333 10 33.3333H30C31.841 33.3333 33.3333 31.841 33.3333 30V10C33.3333 8.15905 31.841 6.66667 30 6.66667H10ZM30 10V30H10V10H30Z' fill='%23a1a1aa'/%3E%3C/svg%3E"
    
    # Get the current date and calculate dates for last week and last month
    today = timezone.now()
    last_week = today - timedelta(days=7)
    last_month = today - timedelta(days=30)
    
    # Basic statistics
    stats = {
        'total_orders': Order.objects.count(),
        'total_revenue': Order.objects.filter(payment_status='completed').aggregate(total=Sum('total_amount'))['total'] or 0,
        'new_customers': User.objects.filter(date_joined__gte=last_month, user_type='CLIENT').count(),
        'out_of_stock': Product.objects.filter(stock=0, status='active').count(),
    }
    
    # Period comparison for percentages (last week vs previous week)
    previous_week = last_week - timedelta(days=7)
    
    # Orders comparison
    current_period_orders = Order.objects.filter(created_at__gte=last_week).count()
    previous_period_orders = Order.objects.filter(created_at__gte=previous_week, created_at__lt=last_week).count()
    if previous_period_orders > 0:
        orders_percentage = ((current_period_orders - previous_period_orders) / previous_period_orders) * 100
    else:
        orders_percentage = 100 if current_period_orders > 0 else 0
        
    # Revenue comparison
    current_revenue = Order.objects.filter(created_at__gte=last_week, payment_status='completed').aggregate(total=Sum('total_amount'))['total'] or 0
    previous_revenue = Order.objects.filter(created_at__gte=previous_week, created_at__lt=last_week, payment_status='completed').aggregate(total=Sum('total_amount'))['total'] or 0
    if previous_revenue > 0:
        revenue_percentage = ((current_revenue - previous_revenue) / previous_revenue) * 100
    else:
        revenue_percentage = 100 if current_revenue > 0 else 0
    
    # Customers comparison
    current_new_customers = User.objects.filter(date_joined__gte=last_week, user_type='CLIENT').count()
    previous_new_customers = User.objects.filter(date_joined__gte=previous_week, date_joined__lt=last_week, user_type='CLIENT').count()
    if previous_new_customers > 0:
        customers_percentage = ((current_new_customers - previous_new_customers) / previous_new_customers) * 100
    else:
        customers_percentage = 100 if current_new_customers > 0 else 0
    
    # Stock comparison
    current_out_of_stock = Product.objects.filter(stock=0, status='active').count()
    # Since Product model doesn't have updated_at field, we can't do time-based comparison
    # So we'll just keep a neutral comparison for stocks
    previous_out_of_stock = 0
    stock_percentage = 0  # Neutral for stock - it's not directly comparable
    
    # Daily sales data with better error handling and debug output
    daily_sales = []
    try:
        # For the past 7 days
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_total = Order.objects.filter(
                created_at__date=day.date(),
                payment_status='completed'
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            # Add to the data list
            daily_sales.append({
                'date': day.strftime('%a'),
                'value': float(day_total)
            })
        
        # Debug output
        print(f"Daily sales data: {daily_sales}")
        
    except Exception as e:
        print(f"Error generating daily sales data: {e}")
        # Provide default data on error
        daily_sales = [
            {'date': 'Lun', 'value': 0},
            {'date': 'Mar', 'value': 0},
            {'date': 'Mer', 'value': 0},
            {'date': 'Jeu', 'value': 0},
            {'date': 'Ven', 'value': 0},
            {'date': 'Sam', 'value': 0},
            {'date': 'Dim', 'value': 0}
        ]
    
    # Category data for pie chart with better error handling
    categories_data = []
    try:
        categories = Category.objects.all()
        
        # If there are no categories, create a default one
        if not categories.exists():
            categories_data.append({
                'name': 'Pas de catégories',
                'value': 100,
                'color': '#6b21a8'
            })
        else:
            for category in categories:
                # Get all SKUs for products in this category
                category_skus = Product.objects.filter(category=category).values_list('sku', flat=True)
                
                # Calculate total sales for these SKUs
                category_total = 0
                if category_skus:
                    category_total = OrderItem.objects.filter(
                        order__payment_status='completed',
                        product_sku__in=category_skus
                    ).aggregate(total=Sum('total_price'))['total'] or 0
                
                # Always add the category, even with zero sales
                categories_data.append({
                    'name': category.name,
                    'value': float(category_total) if category_total else 0,
                    'color': category.color
                })
                
        # Debug output
        print(f"Categories data: {categories_data}")
        
        # If all categories have 0 value, add a default
        if all(cat['value'] == 0 for cat in categories_data):
            categories_data = [{
                'name': 'Pas de données de vente',
                'value': 100,
                'color': '#6b21a8'
            }]
            
    except Exception as e:
        print(f"Error generating categories data: {e}")
        # Provide default data on error
        categories_data = [{
            'name': 'Erreur de données',
            'value': 100,
            'color': '#6b21a8'
        }]
    
    # Top products - different approach with better error handling
    top_products_data = []
    
    try:
        # Get all order items with their quantities
        order_items = OrderItem.objects.values('product_name', 'product_sku').annotate(
            sales_count=Sum('quantity')
        ).order_by('-sales_count')[:5]
        
        if order_items:
            max_sales = order_items[0]['sales_count']
            
            for item in order_items:
                product_sku = item['product_sku']
                product_name = item['product_name']
                sales_count = item['sales_count']
                
                # Try to find the corresponding product
                try:
                    product = Product.objects.get(sku=product_sku)
                    product_image = product.media.filter(media_type='image').first()
                    if product_image and product_image.file:
                        image_url = product_image.file.url
                    else:
                        image_url = DEFAULT_IMAGE
                except Product.DoesNotExist:
                    # If product not found, still display with default image
                    image_url = DEFAULT_IMAGE
                except Exception as e:
                    print(f"Error getting product image: {e}")
                    image_url = DEFAULT_IMAGE
                
                # Add to the data list
                top_products_data.append({
                    'id': product.id if 'product' in locals() else '0',
                    'name': product_name,
                    'sales': sales_count,
                    'image': image_url,
                    'percentage': (sales_count / max_sales) * 100 if max_sales > 0 else 0
                })
        
        # If no data, add a placeholder
        if not top_products_data:
            top_products_data.append({
                'id': '0',
                'name': 'Pas de données disponibles',
                'sales': 0,
                'image': DEFAULT_IMAGE,
                'percentage': 0
            })
            
    except Exception as e:
        print(f"Error in top products calculation: {e}")
        # Add a placeholder on error
        top_products_data.append({
            'id': '0',
            'name': 'Erreur de chargement des données',
            'sales': 0,
            'image': DEFAULT_IMAGE,
            'percentage': 0
        })
    
    # Recent orders
    recent_orders = Order.objects.select_related('customer').order_by('-created_at')[:10]
    
    recent_orders_data = []
    for order in recent_orders:
        items_count = order.items.count()
        recent_orders_data.append({
            'id': order.order_number,
            'customer_name': order.customer.get_full_name(),
            'customer_image': order.customer.profile_picture.url if order.customer.profile_picture else DEFAULT_IMAGE,
            'products_count': items_count,
            'total': order.total_amount,
            'status': order.status,
            'date': order.created_at.strftime('%Y-%m-%d'),
        })
    
    # Prepare chart data as JSON for JavaScript
    # Make sure all data is JSON serializable
    chart_data = {
        'dailySales': [{'date': item['date'], 'value': float(item['value'])} for item in daily_sales],
        'weeklySales': [],  # You can implement weekly data similarly
        'monthlySales': [],  # You can implement monthly data similarly
        'categories': [{'name': item['name'], 'value': float(item['value']), 'color': item['color']} for item in categories_data],
    }
    
    context = {
        'stats': stats,
        'orders_percentage': round(orders_percentage, 1),
        'revenue_percentage': round(revenue_percentage, 1),
        'customers_percentage': round(customers_percentage, 1),
        'stock_percentage': stock_percentage,
        'chart_data': json.dumps(chart_data),
        'top_products': top_products_data,
        'recent_orders': recent_orders_data,
    }
    
    return render(request, 'dashboard/dashboard.html', context)





@login_required
def admin_profile(request):
    user = request.user
    
    # Gérer la soumission du formulaire
    if request.method == 'POST':
        # Déterminer quelle section est mise à jour
        section = request.POST.get('section', 'info')
        
        if section == 'info':
            # Mise à jour des informations personnelles
            user.first_name = request.POST.get('first_name', user.first_name)
            user.last_name = request.POST.get('last_name', user.last_name)
            user.email = request.POST.get('email', user.email)
            user.phone = request.POST.get('phone', user.phone)
            
            # Nouveaux champs ajoutés
            user.gender = request.POST.get('gender', user.gender)
            
            # Gestion de la date de naissance
            birth_date = request.POST.get('birth_date')
            if birth_date:
                user.birth_date = birth_date
            
            # Gestion de l'avatar
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
            if request.POST.get('remove_avatar', '') == 'true':
                if user.profile_picture:
                    try:
                        if os.path.isfile(user.profile_picture.path):
                            os.remove(user.profile_picture.path)
                    except Exception as e:
                        pass
                user.profile_picture = None
            
            user.save()
            messages.success(request, _('Informations personnelles mises à jour avec succès.'))
            
        elif section == 'professional':
            # Mise à jour des informations professionnelles
            user.company_name = request.POST.get('company_name', user.company_name)
            user.profession = request.POST.get('profession', user.profession)
            
            user.save()
            messages.success(request, _('Informations professionnelles mises à jour avec succès.'))
            
        elif section == 'security':
            # Mise à jour du mot de passe
            current_password = request.POST.get('current_password')
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')
            
            if not user.check_password(current_password):
                messages.error(request, _('Le mot de passe actuel est incorrect.'))
            elif new_password != confirm_password:
                messages.error(request, _('Les mots de passe ne correspondent pas.'))
            else:
                user.set_password(new_password)
                user.save()
                messages.success(request, _('Mot de passe mis à jour avec succès.'))
                # Rediriger pour maintenir la session
                return redirect('admin_profile')
                
        elif section == 'preferences':
            # Mise à jour des préférences (à implémenter selon vos besoins)
            # Exemple: user.preferences.language = request.POST.get('language')
            messages.success(request, _('Préférences mises à jour avec succès.'))
            
        elif section == 'notifications':
            # Mise à jour des préférences de notification
            # Exemple: user.notification_settings.email_enabled = request.POST.get('email_notifications') == 'on'
            messages.success(request, _('Préférences de notification mises à jour avec succès.'))
    
    # Préparation du contexte pour le template
    context = {
        'user': user,
        'active_section': request.GET.get('section', 'info'),
        'address_types': UserAddress.ADDRESS_TYPES,  # Pour le formulaire d'adresse
    }
    
    # Note: Les statistiques utilisateur ont été déplacées vers le dashboard
    
    return render(request, 'dashboard/profile.html', context)


@login_required
def admin_address(request):
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
        
    return redirect('admin_profile')


@login_required
def delete_address(request, address_id):
    address = get_object_or_404(UserAddress, id=address_id, user=request.user)
    address.delete()
    messages.success(request, _('Adresse supprimée avec succès.'))
    return redirect('admin_profile')