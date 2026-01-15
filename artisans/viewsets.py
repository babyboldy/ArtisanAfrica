# artisans/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Region, CraftType, Artisan, ArtisanApplication, ApplicationPhoto, Testimonial
from .serializers import (
    RegionSerializer, CraftTypeSerializer, ArtisanSerializer,
    ArtisanApplicationSerializer, ApplicationPhotoSerializer, TestimonialSerializer
)

class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class CraftTypeViewSet(viewsets.ModelViewSet):
    queryset = CraftType.objects.all()
    serializer_class = CraftTypeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ArtisanViewSet(viewsets.ModelViewSet):
    queryset = Artisan.objects.filter(is_active=True)
    serializer_class = ArtisanSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ArtisanApplicationViewSet(viewsets.ModelViewSet):
    queryset = ArtisanApplication.objects.all()
    serializer_class = ArtisanApplicationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ApplicationPhotoViewSet(viewsets.ModelViewSet):
    queryset = ApplicationPhoto.objects.all()
    serializer_class = ApplicationPhotoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.filter(is_active=True)
    serializer_class = TestimonialSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]