from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .viewsets import ContactViewSet, NewsletterViewSet, StockAlertViewSet

router = DefaultRouter()
router.register(r'contacts', ContactViewSet, basename='contacts')
router.register(r'newsletters', NewsletterViewSet, basename='newsletters')
router.register(r'stock-alerts', StockAlertViewSet, basename='stock-alerts')
urlpatterns = [
    path('', views.contact_view, name='contact'),
    path('newsletter/subscribe/', views.newsletter_subscribe, name='newsletter_subscribe'),
    path('', include(router.urls)),
]