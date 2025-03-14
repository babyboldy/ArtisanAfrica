from django.urls import path
from . import views

urlpatterns = [
    path('', views.contact_view, name='contact'),
    path('newsletter/subscribe/', views.newsletter_subscribe, name='newsletter_subscribe'),
]