# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/orders/', views.admin_orders, name='admin_orders'),
    path('orders/<int:order_id>/detail/', views.client_order_detail, name='client_order_detail'),
    path('dashboard/orders/export_xls/', views.export_orders_xls, name='export_orders_xls'),
    path('dashboard/orders/export_pdf/', views.export_orders_pdf, name='export_orders_pdf'),
    path('dashboard/orders/export_csv/', views.export_orders_csv, name='export_orders_csv'),

    path('<int:order_id>/invoice/', views.generate_invoice, name='generate_invoice')
]