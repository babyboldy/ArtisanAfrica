from django.urls import path,include
from rest_framework.routers import DefaultRouter
from . import views, viewsets



# Créer un routeur pour les viewsets
router = DefaultRouter()
router.register(r'users', viewsets.UserViewSet)
router.register(r'addresses', viewsets.UserAddressViewSet)
urlpatterns = [
    # Connection
    path('login/', views.login_page, name='login'),
    path('register/', views.register_page, name='register'),
    path('logout/', views.logout_user, name='logout'),
    path('confirm-email/<str:token>/', views.confirm_email, name='confirm_email'),
    
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/<str:token>/', views.reset_password, name='reset_password'),


    # interface administrateur
    path('customers/', views.admin_customers, name='admin_customers'),
    path('customers/<int:customer_id>/detail/', views.customer_detail, name='customer_detail'),
    path('api/', include(router.urls)),

]