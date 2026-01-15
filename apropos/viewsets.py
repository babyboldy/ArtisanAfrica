from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import TeamMember, CompanyValue, Testimonial, AboutContent, ProcessStep
from .serializers import (
    TeamMemberSerializer, CompanyValueSerializer, TestimonialSerializer,
    AboutContentSerializer, ProcessStepSerializer
)

class TeamMemberViewSet(viewsets.ModelViewSet):
    queryset = TeamMember.objects.filter(is_active=True)
    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class CompanyValueViewSet(viewsets.ModelViewSet):
    queryset = CompanyValue.objects.filter(is_active=True)
    serializer_class = CompanyValueSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.filter(is_active=True)
    serializer_class = TestimonialSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class AboutContentViewSet(viewsets.ModelViewSet):
    queryset = AboutContent.objects.all()
    serializer_class = AboutContentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        # Vérifie qu'il n'existe qu'une seule instance
        if AboutContent.objects.exists():
            raise serializers.ValidationError("Une instance de AboutContent existe déjà.")
        serializer.save()

class ProcessStepViewSet(viewsets.ModelViewSet):
    queryset = ProcessStep.objects.filter(is_active=True)
    serializer_class = ProcessStepSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]