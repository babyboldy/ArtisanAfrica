from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .viewsets import (
    RegionViewSet, CraftTypeViewSet, ArtisanViewSet,
    ArtisanApplicationViewSet, ApplicationPhotoViewSet, TestimonialViewSet
)
from django.conf import settings
from django.conf.urls.static import static


router = DefaultRouter()
router.register(r'regions', RegionViewSet, basename='regions')
router.register(r'craft-types', CraftTypeViewSet, basename='craft-types')
router.register(r'artisans', ArtisanViewSet, basename='artisans')
router.register(r'applications', ArtisanApplicationViewSet, basename='applications')
router.register(r'application-photos', ApplicationPhotoViewSet, basename='application-photos')
router.register(r'testimonials', TestimonialViewSet, basename='testimonials')
app_name = 'artisans'  # Define the namespace

urlpatterns = [
    path('', views.artisans_list, name='artisans_list'),
    path('application/', views.artisan_application, name='artisan_application'),
    path('<int:artisan_id>/', views.artisan_detail, name='artisan_detail'),
    path('<int:artisan_id>/contact/', views.contact_artisan, name='contact_artisan'),
    path('', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
