from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='admin_dashboard'),
    path('profile/', views.admin_profile, name='admin_profile'),
    path('profile/address/', views.admin_address, name='admin_address'),
    path('profile/address/delete/<int:address_id>/', views.delete_address, name='delete_address'),
]