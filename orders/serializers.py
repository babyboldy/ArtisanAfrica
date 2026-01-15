# orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem, OrderNote
from django.contrib.auth import get_user_model
from products.serializers import ProductSerializer  # Assurez-vous que ce serializer existe

User = get_user_model()

class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.StringRelatedField(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset='products.Product', source='product', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = OrderItem
        fields = [
            'id', 'order', 'product', 'product_id', 'product_image', 'product_name',
            'product_sku', 'quantity', 'unit_price', 'total_price', 'options',
            'created_at', 'updated_at'
        ]

class OrderNoteSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True, allow_null=True
    )

    class Meta:
        model = OrderNote
        fields = [
            'id', 'order', 'user', 'user_id', 'note', 'attachment', 'created_at'
        ]

class OrderSerializer(serializers.ModelSerializer):
    customer = serializers.StringRelatedField(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='customer', write_only=True
    )
    items = OrderItemSerializer(many=True, read_only=True)
    notes = OrderNoteSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_id', 'status', 'created_at',
            'updated_at', 'subtotal', 'shipping_cost', 'tax_amount', 'total_amount',
            'payment_status', 'payment_method', 'payment_details', 'payment_date',
            'shipping_address_text', 'billing_address_text', 'ip_address', 'user_agent',
            'tracking_number', 'estimated_delivery_date', 'email_sent', 'items', 'notes'
        ]