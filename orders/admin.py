# admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Order, OrderItem, OrderNote

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    readonly_fields = ['total_price']

class OrderNoteInline(admin.StackedInline):
    model = OrderNote
    extra = 1

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 
        'customer', 
        'status', 
        'payment_status', 
        'total_amount', 
        'created_at'
    ]
    list_filter = ['status', 'payment_status', 'payment_method', 'created_at']
    search_fields = ['order_number', 'customer__email', 'customer__first_name', 'customer__last_name']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
    inlines = [OrderItemInline, OrderNoteInline]
    
    fieldsets = (
        (_('Informations principales'), {
            'fields': ('order_number', 'customer', 'status', 'created_at', 'updated_at')
        }),
        (_('Paiement'), {
            'fields': ('payment_status', 'payment_method', 'payment_details', 'payment_date')
        }),
        (_('Montants'), {
            'fields': ('subtotal', 'shipping_cost', 'tax_amount', 'total_amount')
        }),
        (_('Adresses'), {
            'fields': ('shipping_address_text', 'billing_address_text')
        }),
        (_('Livraison'), {
            'fields': ('tracking_number', 'estimated_delivery_date')
        }),
        (_('Métadonnées'), {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        })
    )