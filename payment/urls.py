from django.urls import path
from . import views

urlpatterns = [
    path('', views.payment_page, name='payment'),
    path('process/', views.process_payment, name='process_payment'),
    path('confirmation/<str:order_number>/', views.payment_confirmation, name='payment_confirmation'),
]