# contact/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from .models import Contact, Newsletter, StockAlert
from .serializers import ContactSerializer, NewsletterSerializer, StockAlertSerializer

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    #permission_classes = [IsAdminUser]  # Réservé aux admins
    

    def get_permissions(self):
        # Permettre à tout le monde de créer un contact (POST)
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

class NewsletterViewSet(viewsets.ModelViewSet):
    queryset = Newsletter.objects.filter(active=True)
    serializer_class = NewsletterSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        # Permettre à tout le monde de s'inscrire à la newsletter (POST)
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

class StockAlertViewSet(viewsets.ModelViewSet):
    queryset = StockAlert.objects.all()
    serializer_class = StockAlertSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        # Permettre à tout le monde de créer une alerte de stock (POST)
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()