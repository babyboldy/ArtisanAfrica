# notifications/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification, NotificationGroup
from .serializers import NotificationSerializer, NotificationGroupSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Restreindre les notifications à celles de l'utilisateur connecté
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'marked as read'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        notification = self.get_object()
        notification.archive()
        return Response({'status': 'archived'})

class NotificationGroupViewSet(viewsets.ModelViewSet):
    queryset = NotificationGroup.objects.all()
    serializer_class = NotificationGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Restreindre les groupes aux notifications de l'utilisateur connecté
        return NotificationGroup.objects.filter(notifications__user=self.request.user).distinct()
    
