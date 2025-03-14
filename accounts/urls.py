from django.urls import path
from . import views  # Assurez-vous d'importer vos vues

urlpatterns = [
    # Connection
    path('login/', views.login_page, name='login'),
    path('register/', views.register_page, name='register'),
    path('logout/', views.logout_user, name='logout'),


    # interface administrateur
    path('customers/', views.admin_customers, name='admin_customers'),
    path('customers/<int:customer_id>/detail/', views.customer_detail, name='customer_detail'),

]