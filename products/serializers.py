# products/serializers.py
from rest_framework import serializers
from .models import Category, Product, ProductMedia

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'icon', 'color', 'featured', 'image'
        ]

class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ['id', 'product', 'media_type', 'file']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True
    )
    media = ProductMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_id', 'name', 'description', 'price',
            'stock', 'sku', 'barcode', 'weight', 'status', 'featured',
            'created_at', 'updated_at', 'media'
        ]