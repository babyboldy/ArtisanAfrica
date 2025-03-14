from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.http import JsonResponse
from django.urls import reverse
from orders.models import Order, OrderItem, OrderNote
from products.models import Product
import json
import uuid
from decimal import Decimal

@login_required
def payment_page(request):
    # Préparez les adresses de l'utilisateur pour pré-remplir le formulaire
    context = {
        'user_addresses': request.user.addresses.all(),
        'default_address': request.user.addresses.filter(is_default=True).first()
    }
    # Désactivation du cache pour les ressources statiques
    response = render(request, 'website/payment.html', context)
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response






@csrf_exempt
@login_required
@require_http_methods(["POST"])
def process_payment(request):
    try:
        # Récupération de la méthode de paiement
        payment_method = request.POST.get('payment_method')
        if not payment_method:
            messages.error(request, "Veuillez sélectionner une méthode de paiement.")
            return redirect('payment')
        
        # NOUVEAU: Récupération optimisée des articles du panier
        # 1. D'abord vérifier s'il y a un JSON complet du panier
        cart_items_data = []
        if request.POST.get('full_cart_json'):
            try:
                cart = json.loads(request.POST.get('full_cart_json'))
                print(f"Panier complet récupéré via full_cart_json: {len(cart)} articles")
                # Utiliser directement les objets du panier complet
                cart_items_data = cart
            except json.JSONDecodeError as e:
                print(f"Erreur de décodage du JSON complet: {e}")
        
        # 2. Si pas de JSON complet, essayer le format indexé cart_items[0], cart_items[1], etc.
        if not cart_items_data:
            index = 0
            while True:
                item_json = request.POST.get(f'cart_items[{index}]')
                if not item_json:
                    break
                try:
                    item = json.loads(item_json)
                    cart_items_data.append(item)
                    print(f"Article {index} récupéré: {item['name']}")
                except json.JSONDecodeError:
                    print(f"Erreur de décodage pour l'article {index}")
                index += 1
            
            print(f"Récupéré {len(cart_items_data)} articles via cart_items[index]")
        
        # 3. En dernier recours, essayer l'ancien format cart_items[]
        if not cart_items_data:
            old_format_items = request.POST.getlist('cart_items[]')
            print(f"Tentative avec l'ancien format: {len(old_format_items)} articles trouvés")
            
            for item_json in old_format_items:
                try:
                    item = json.loads(item_json)
                    cart_items_data.append(item)
                except json.JSONDecodeError:
                    print(f"Erreur de décodage JSON dans l'ancien format")
        
        # Vérifier que le panier n'est pas vide
        if not cart_items_data:
            messages.error(request, "Votre panier est vide ou les données sont mal formatées.")
            return redirect('payment')

        print(f"Nombre total d'articles récupérés: {len(cart_items_data)}")
        for i, item in enumerate(cart_items_data):
            print(f"Article {i}: {item.get('name', 'Inconnu')} - Qté: {item.get('quantity', 0)}")

        # Création d'un numéro de commande unique
        order_number = f"CMD-{uuid.uuid4().hex[:8].upper()}"

        # Récupération de l'adresse de livraison
        shipping_address = {
            'street': request.POST.get('street_address'),
            'apartment': request.POST.get('apartment', ''),
            'city': request.POST.get('city'),
            'postal_code': request.POST.get('postal_code'),
            'country': request.POST.get('country')
        }

        # Vérification des champs obligatoires de l'adresse
        required_address_fields = ['street', 'city', 'postal_code', 'country']
        missing_fields = [field for field in required_address_fields if not shipping_address[field]]
        if missing_fields:
            messages.error(request, "Veuillez remplir tous les champs obligatoires de l'adresse.")
            return redirect('payment')

        # Calcul direct des montants depuis les champs cachés du formulaire
        subtotal = Decimal(request.POST.get('subtotal', '0.00'))
        tax_amount = Decimal(request.POST.get('tax_amount', '0.00'))
        shipping_cost = Decimal(request.POST.get('shipping_cost', '0.00'))
        total_amount = Decimal(request.POST.get('total_amount', '0.00'))

        # Création de la commande
        order = Order.objects.create(
            order_number=order_number,
            customer=request.user,
            status='pending',
            payment_method=payment_method,
            payment_status='pending' if payment_method == 'delivery' else 'completed',
            shipping_address_text=f"{shipping_address['street']} {shipping_address['apartment']}, {shipping_address['postal_code']} {shipping_address['city']}, {shipping_address['country']}",
            billing_address_text=f"{shipping_address['street']} {shipping_address['apartment']}, {shipping_address['postal_code']} {shipping_address['city']}, {shipping_address['country']}",
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            tax_amount=tax_amount,
            total_amount=total_amount,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            estimated_delivery_date=timezone.now().date() + timezone.timedelta(days=5)
        )

        # Liste pour stocker les éventuelles erreurs de stock
        stock_errors = []
        created_items = 0
        
        # MODIFICATION IMPORTANTE: Traitement simplifié et robuste des articles du panier
        for item in cart_items_data:
            try:
                # Extraire les données de l'article de manière sécurisée
                product_id = None
                if 'id' in item:
                    try:
                        product_id = int(str(item['id']).strip())
                    except (ValueError, TypeError):
                        product_id = None
                
                product_name = item.get('name', 'Produit inconnu')
                quantity = int(item.get('quantity', 1))
                price = Decimal(str(item.get('price', '0.00')))
                options = item.get('options')
                
                # IMPORTANT: S'assurer que sku n'est jamais None ou vide
                sku = item.get('sku', '') 
                if not sku:  # Si sku est None, vide ou non présent
                    sku = f"SKU-{order.order_number}-{created_items}"
                    
                print(f"Traitement de l'article: {product_name}, ID: {product_id}, Qté: {quantity}, Prix: {price}, SKU: {sku}")
                
                # Récupérer le produit si ID valide
                product = None
                if product_id:
                    try:
                        product = Product.objects.get(id=product_id)
                        # Vérifier le stock
                        if product.stock < quantity:
                            stock_errors.append(f"Stock insuffisant pour {product.name}. Disponible: {product.stock}, Demandé: {quantity}")
                            continue
                        
                        # IMPORTANT: Récupérer le SKU du produit ou utiliser le SKU par défaut
                        product_sku = getattr(product, 'sku', None) or sku
                        
                        # Créer l'OrderItem avec référence au produit
                        item = OrderItem.objects.create(
                            order=order,
                            product=product,
                            product_name=product.name,
                            product_sku=product_sku,
                            quantity=quantity,
                            unit_price=product.price,
                            total_price=product.price * quantity,
                            options=options
                        )
                        
                        # Mettre à jour le stock
                        product.stock -= quantity
                        product.save()
                    except Product.DoesNotExist:
                        product = None
                
                # Si pas de produit trouvé, créer un OrderItem sans référence produit
                if not product:
                    item = OrderItem.objects.create(
                        order=order,
                        product_name=product_name,
                        product_sku=sku,  # Utiliser le SKU par défaut ou fourni
                        quantity=quantity,
                        unit_price=price,
                        total_price=price * quantity,
                        options=options
                    )
                
                created_items += 1
                print(f"OrderItem créé avec succès: {product_name}, ID: {product_id}, SKU: {sku}")
                
            except Exception as e:
                print(f"Erreur lors de la création d'un OrderItem: {e}")
                import traceback
                traceback.print_exc()
                # Continuer avec l'article suivant
                continue
        
        print(f"Total d'articles créés: {created_items}")
        
        # Si des erreurs de stock ont été détectées, annuler la commande
        if stock_errors:
            order.delete()
            for error in stock_errors:
                messages.error(request, error)
            return redirect('payment')

        # Ajouter les instructions de livraison, si renseignées
        instructions = request.POST.get('delivery_instructions')
        if instructions:
            OrderNote.objects.create(order=order, user=request.user, note=instructions)

        # Enregistrer téléphone et email en cas de paiement à la livraison
        if payment_method == 'delivery':
            phone = request.POST.get('phone')
            email = request.POST.get('email')
            if phone and email:  # Vérification des champs obligatoires
                order.payment_details = {'delivery_phone': phone, 'delivery_email': email}
                order.save()

        # Vérification finale
        item_count = order.items.count()
        print(f"Vérification finale: {item_count} articles dans la commande")

        messages.success(request, 'Commande enregistrée avec succès!')
        
        # Vider le panier en supprimant la clé du localStorage via JavaScript
        response = redirect(reverse('payment_confirmation', args=[order.order_number]))
        response.set_cookie('clear_cart', 'true')
        return response
            
    except Exception as e:
        # Enregistrement de l'erreur pour débogage
        print(f"ERREUR COMPLÈTE: {e}")
        import traceback
        traceback.print_exc()
        # Message d'erreur pour l'utilisateur
        messages.error(request, "Erreur lors du traitement de la commande. Veuillez réessayer.")
        # Redirection vers la page de paiement
        return redirect('payment')
    





@login_required
def payment_confirmation(request, order_number):
    try:
        # Récupérer la commande correspondant au numéro et à l'utilisateur connecté
        order = Order.objects.get(order_number=order_number, customer=request.user)
        
        # NOUVELLE APPROCHE: Récupération explicite de tous les articles avec prefetch_related
        from django.db.models import Prefetch
        order = Order.objects.prefetch_related(
            Prefetch('items', queryset=OrderItem.objects.all())
        ).get(order_number=order_number, customer=request.user)
        
        # Vérification des articles de la commande
        items = list(order.items.all())  # Forcer l'évaluation de la requête
        print(f"Commande #{order_number} - Nombre d'articles: {len(items)}")
        
        for item in items:
            print(f"Article trouvé: {item.product_name}, Quantité: {item.quantity}, Prix total: {item.total_price}")
        
        # Si aucun article n'est trouvé mais que la commande existe, afficher un avertissement
        if len(items) == 0:
            print("ATTENTION: La commande existe mais ne contient aucun article!")
            messages.warning(request, "Votre commande a été enregistrée, mais aucun article n'a été trouvé. Veuillez contacter le service client.")
        
        # Préparation du contexte pour le template
        context = {
            'order': order,
            'items': items,
            'debug_info': {
                'items_count': len(items),
                'order_id': order.id,
                'order_number': order.order_number
            }
        }
        
        # Rendu du template avec le contexte
        response = render(request, 'website/confirmation.html', context)
        
        # Script pour vider le panier après confirmation
        response.set_cookie('clear_cart', 'true')
        return response
        
    except Order.DoesNotExist:
        # Si la commande n'existe pas, afficher un message d'erreur
        messages.error(request, "Commande non trouvée.")
        return redirect('payment')