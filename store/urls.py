from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_page, name='home'),

    path('profile/', views.client_profile, name='client_profile'),
    path('profile/address/', views.client_profile_address, name='client_profile_address'),
    path('profile/address/delete/', views.client_delete_address, name='client_delete_address'),
    path('profile/address/delete/<int:address_id>/', views.client_delete_address, name='client_delete_address_with_id')
]