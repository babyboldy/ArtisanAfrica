from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .viewsets import CategoryViewSet, ProductViewSet, ProductMediaViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'products', ProductViewSet, basename='products')
router.register(r'media', ProductMediaViewSet, basename='product-media')

urlpatterns = [
    # Gestion des catégories
    path('categories/', views.admin_category, name='admin_categories'),
    path('categories/add/', views.add_category, name='add_category'),
    path('categories/edit/<int:category_id>/', views.edit_category, name='edit_category'),
    path('categories/delete/', views.delete_category, name='delete_category'),

    # Gestion des produits chez l'admin
    path('products_admin/', views.admin_products, name='admin_products'),  # URL racine pour la liste des produits
    path('products_admin/add/', views.add_product, name='add_product'),    # Simplifié
    path('products_admin/edit/<int:product_id>/', views.edit_product, name='edit_product'),
    path('products_admin/delete/', views.delete_product, name='delete_product'),
    path('products_admin/image/delete/<int:image_id>/', views.delete_product_image, name='delete_product_image'),

    # Afficher produit chez le client
    path('products/', views.products_page, name='products'),
    path('products/<int:product_id>/', views.products_detail, name='product_detail'),
    path('products/<int:product_id>/check-stock/', views.check_stock, name='check_stock'),
    path('', include(router.urls)),

]

