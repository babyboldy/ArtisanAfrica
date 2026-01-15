# products/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Category, Product, ProductMedia
from .serializers import CategorySerializer, ProductSerializer, ProductMediaSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Ne montrer que les produits actifs aux utilisateurs non authentifiés
        if not self.request.user.is_authenticated:
            return Product.objects.filter(status='active')
        return Product.objects.all()

class ProductMediaViewSet(viewsets.ModelViewSet):
    queryset = ProductMedia.objects.all()
    serializer_class = ProductMediaSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Restreindre les médias aux produits accessibles
        if not self.request.user.is_authenticated:
            return ProductMedia.objects.filter(product__status='active')
        return ProductMedia.objects.all()