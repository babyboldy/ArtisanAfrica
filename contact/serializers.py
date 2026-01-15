# contact/serializers.py
from rest_framework import serializers
from .models import Contact, Newsletter, StockAlert

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'subject',
            'message', 'privacy_accepted', 'created_at'
        ]

class NewsletterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Newsletter
        fields = ['id', 'email', 'date_added', 'active']

class StockAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockAlert
        fields = [
            'id', 'product_id', 'product_name', 'email', 'created_at',
            'notified', 'notified_at'
        ]
        
        

