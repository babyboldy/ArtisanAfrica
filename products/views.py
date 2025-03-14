from sqlite3 import IntegrityError
import uuid
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.urls import reverse
from django.core.files.storage import FileSystemStorage
from .models import Category, Product, ProductMedia
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from .models import Product, Category


# 🌟 Affichage des catégories
@login_required
def admin_category(request):
    search_query = request.GET.get('search', '')
    categories = Category.objects.filter(name__icontains=search_query) if search_query else Category.objects.all()
    
    # Ajouter le nombre de catégories au contexte
    category_count = categories.count()
    
    return render(request, 'dashboard/category.html', {
        'categories': categories,
        'category_count': category_count,  # Nombre de catégories
    })


# 🌟 Ajout d'une catégorie
@login_required
def add_category(request):
    if request.method == "POST":
        try:
            name = request.POST.get('name')
            description = request.POST.get('description', '')
            icon = request.POST.get('icon', 'fa-box')
            color = request.POST.get('color', '#6b21a8')
            featured = request.POST.get('featured') == 'on'
            image = request.FILES.get('image')

            category = Category(
                name=name,
                description=description,
                icon=icon,
                color=color,
                featured=featured,
                image=image
            )
            category.save()
            messages.success(request, "Catégorie ajoutée avec succès!")
        except Exception as e:
            messages.error(request, f"Erreur lors de l'ajout : {str(e)}")
        
        return redirect('admin_categories')

    return redirect('admin_categories')


# 🌟 Modification d'une catégorie
@login_required
def edit_category(request, category_id):
    if request.method == "POST":
        try:
            category = get_object_or_404(Category, id=category_id)
            category.name = request.POST.get('name')
            category.description = request.POST.get('description')
            category.icon = request.POST.get('icon')
            category.color = request.POST.get('color')
            category.featured = request.POST.get('featured') == 'on'

            if 'image' in request.FILES:
                category.image = request.FILES['image']

            category.save()
            messages.success(request, "Catégorie modifiée avec succès!")
        except Exception as e:
            messages.error(request, f"Erreur lors de la modification : {str(e)}")
            
        return redirect('admin_categories')
    
    return redirect('admin_categories')


# 🌟 Suppression d'une catégorie
@login_required
def delete_category(request):
    if request.method == "POST":
        category_id = request.POST.get('category_id')
        try:
            category = get_object_or_404(Category, id=category_id)
            category.delete()
            messages.success(request, "Catégorie supprimée avec succès!")
        except Exception as e:
            messages.error(request, f"Erreur lors de la suppression : {str(e)}")
    return redirect('admin_categories')


# 🌟 Affichage des produits
@login_required
def admin_products(request):
    # Récupération des paramètres de filtrage depuis la requête GET
    search_query = request.GET.get('search', '').strip()
    category_id = request.GET.get('category', '')
    status = request.GET.get('status', '')


    # Récupération des produits
    products = Product.objects.all()

    products_count = products.count()

    # Filtrage par recherche
    if search_query:
        products = products.filter(name__icontains=search_query)

    # Filtrage par catégorie
    if category_id:
        products = products.filter(category_id=category_id)

    # Filtrage par statut
    if status:
        products = products.filter(status=status)

    context = {
        'products': products,
        'products_count': products_count,
        'categories': Category.objects.all(),
        'status_choices': Product.status_choices,
        'selected_category': int(category_id) if category_id else None,
        'selected_status': status,
        'search_query': search_query
    }

    return render(request, 'dashboard/products.html', context)



# 🌟 Ajout d'un produit
@login_required
def add_product(request):
    if request.method == "POST":
        try:
            sku = request.POST.get('sku')

            # Générer un SKU unique s'il est vide
            if not sku:
                sku = str(uuid.uuid4())[:8].upper()

            # Vérifier si ce SKU existe déjà
            if Product.objects.filter(sku=sku).exists():
                messages.error(request, "Ce SKU existe déjà. Veuillez en choisir un autre.")
                return redirect('admin_products')

            # Création du produit
            product = Product(
                name=request.POST.get('name'),
                description=request.POST.get('description', ''),
                price=request.POST.get('price'),
                stock=request.POST.get('stock'),
                sku=sku,
                barcode=request.POST.get('barcode'),
                weight=request.POST.get('weight'),
                category_id=request.POST.get('category'),
                status=request.POST.get('status', 'active'),
                featured=request.POST.get('featured') == 'on'
            )
            product.save()

            # Gestion des images
            images = request.FILES.getlist('product_images[]')
            for image in images:
                ProductMedia.objects.create(
                    product=product,
                    media_type='image',
                    file=image
                )

            messages.success(request, "Produit ajouté avec succès!")
        except IntegrityError:
            messages.error(request, "Erreur : Ce SKU existe déjà. Veuillez en choisir un autre.")
        except Exception as e:
            messages.error(request, f"Erreur lors de l'ajout : {str(e)}")

        return redirect('admin_products')

    categories = Category.objects.all()
    return render(request, 'dashboard/products.html', {'categories': categories})





# 🌟 Modification d'un produit
@login_required
def edit_product(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    
    if request.method == "POST":
        try:
            # Mise à jour des champs de base
            product.name = request.POST.get('name')
            product.description = request.POST.get('description', '')
            product.price = request.POST.get('price')
            product.stock = request.POST.get('stock')
            product.category_id = request.POST.get('category')
            product.status = request.POST.get('status', 'active')
            product.featured = request.POST.get('featured') == 'on'
            
            # Mise à jour des champs supplémentaires
            product.sku = request.POST.get('sku', '')
            product.barcode = request.POST.get('barcode', '')
            product.weight = request.POST.get('weight', None)
            
            product.save()

            # Gestion des nouvelles images
            images = request.FILES.getlist('product_images[]')
            for image in images:
                ProductMedia.objects.create(
                    product=product,
                    media_type='image',
                    file=image
                )

            messages.success(request, "Produit modifié avec succès!")
        except Exception as e:
            messages.error(request, f"Erreur lors de la modification : {str(e)}")
        
        return redirect('admin_products')

    # Pour l'affichage du formulaire
    return render(request, 'dashboard/products.html', {
        'product': product,
        'categories': Category.objects.all(),
        'status_choices': Product.status_choices,
        'media': [{'id': m.id, 'url': m.file.url} for m in product.media.all()]
    })




# 🌟 Suppression d'un produit
@login_required
def delete_product(request):
    if request.method == "POST":
        product_id = request.POST.get('product_id')
        try:
            product = get_object_or_404(Product, id=product_id)
            product.delete()
            messages.success(request, "Produit supprimé avec succès!")
        except Exception as e:
            messages.error(request, f"Erreur lors de la suppression : {str(e)}")
    return redirect('admin_products')



@login_required
def delete_product_image(request, image_id):
    if request.method == "POST":
        try:
            media = get_object_or_404(ProductMedia, id=image_id)
            media.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Méthode non autorisée'})




# 🌟 Affichage des produits chez le client
def products_page(request):
    # Commencer avec tous les produits actifs et en stock
    products_list = Product.objects.filter(status='active', stock__gt=0)
    print("Nombre de produits actifs et en stock:", products_list.count())

    # Récupérer les paramètres de filtrage
    search_query = request.GET.get('search', '')
    category_id = request.GET.get('category')
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')
    
    # Appliquer les filtres
    if search_query:
        products_list = products_list.filter(name__icontains=search_query)
        print(f"Après filtre recherche '{search_query}':", products_list.count())
    
    if category_id:
        products_list = products_list.filter(category_id=category_id)
        print(f"Après filtre catégorie {category_id}:", products_list.count())
    
    if min_price:
        products_list = products_list.filter(price__gte=min_price)
    
    if max_price:
        products_list = products_list.filter(price__lte=max_price)
    
    # Trier les produits
    sort_by = request.GET.get('sort', 'newest')
    if sort_by == 'price-asc':
        products_list = products_list.order_by('price')
    elif sort_by == 'price-desc':
        products_list = products_list.order_by('-price')
    elif sort_by == 'newest':
        products_list = products_list.order_by('-id')
    
    # Configurer la pagination
    paginator = Paginator(products_list, 12)
    page = request.GET.get('page', 1)
    
    try:
        products = paginator.page(page)
    except:
        products = paginator.page(1)
    
    total_products = products_list.count()
    print("Nombre final de produits:", total_products)
    
    context = {
        'products': products,
        'categories': Category.objects.all(),
        'total_products': total_products,
        'current_filters': {
            'search': search_query,
            'category': category_id,
            'min_price': min_price,
            'max_price': max_price,
            'sort': sort_by
        }
    }
    
    return render(request, 'website/products.html', context)




def products_detail(request, product_id):
    # Récupérer le produit spécifique ou renvoyer une 404 si non trouvé
    product = get_object_or_404(Product, id=product_id)
    
    # Rediriger vers la page des produits si le produit est en rupture de stock
    if product.stock <= 0:
        messages.info(request, f"Le produit '{product.name}' est actuellement en rupture de stock.")
        return redirect('products')
    
    # Récupérer des produits similaires (même catégorie et en stock)
    similar_products = Product.objects.filter(
        category=product.category,
        stock__gt=0  # Seulement les produits en stock
    ).exclude(id=product.id)[:4]  # Limite à 4 produits similaires
    
    context = {
        'product': product,
        'similar_products': similar_products,
    }
    
    return render(request, 'website/product-detail.html', context)




def check_stock(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    return JsonResponse({"stock": product.stock})