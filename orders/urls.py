# urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Vue principale du tableau de bord des commandes
    path('', views.admin_orders, name='admin_orders'),
    
    # Détail des commandes
    path('<int:order_id>/detail/', views.admin_order_detail, name='admin_order_detail'),
    path('client/<int:order_id>/detail/', views.client_order_detail, name='client_order_detail'),
    
    # AJAX et API pour les mises à jour sans rechargement
    path('<int:order_id>/details/', views.get_order_details, name='get_order_details'),
    path('change-status/', views.change_order_status, name='change_order_status'),
    path('change-payment-status/', views.change_payment_status, name='change_payment_status'),
    path('orders/<int:order_id>/details/', views.order_detail_json, name='order_detail_json'),
    path('<int:order_id>/update-tracking/', views.update_tracking_number, name='update_tracking_number'),
    path('<int:order_id>/add-note/', views.add_order_note, name='add_order_note'),
    path('batch-update/', views.batch_update_orders, name='batch_update_orders'),
    
    # Exports et factures
    path('export/xls/', views.export_orders_xls, name='export_orders_xls'),
    path('export/pdf/', views.export_orders_pdf, name='export_orders_pdf'),
    path('export/csv/', views.export_orders_csv, name='export_orders_csv'),
    path('<int:order_id>/invoice/', views.generate_invoice, name='generate_invoice'),
    
    # Paiement et processus de commande
    path('payment/', views.payment_page, name='payment'),
    path('process-payment/', views.process_payment, name='process_payment'),
    path('confirmation/<str:order_number>/', views.payment_confirmation, name='payment_confirmation'),
]