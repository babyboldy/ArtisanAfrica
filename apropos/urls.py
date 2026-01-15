# urls.py
from django.urls import include, path
from . import views
from rest_framework.routers import DefaultRouter
from .viewsets import (
    TeamMemberViewSet, CompanyValueViewSet, TestimonialViewSet,
    AboutContentViewSet, ProcessStepViewSet
)

router = DefaultRouter()
router.register(r'team-members', TeamMemberViewSet, basename='team-members')
router.register(r'company-values', CompanyValueViewSet, basename='company-values')
router.register(r'testimonials', TestimonialViewSet, basename='testimonials')
router.register(r'about-content', AboutContentViewSet, basename='about-content')
router.register(r'process-steps', ProcessStepViewSet, basename='process-steps')
# Si vous utilisez la vue basée sur une fonction
urlpatterns = [
    # Autres URLs existantes...
    path('about/', views.about_view, name='about'),
    path('', include(router.urls)),]

# Si vous utilisez la vue basée sur une classe
# urlpatterns = [
#     # Autres URLs existantes...
#     path('about/', views.AboutView.as_view(), name='about'),
# ]