# orders/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Order, OrderItem, OrderNote
from .serializers import OrderSerializer, OrderItemSerializer, OrderNoteSerializer

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Restreindre les commandes à celles de l'utilisateur connecté, sauf pour les superusers
        if self.request.user.is_superuser:
            return Order.objects.all()
        return Order.objects.filter(customer=self.request.user)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note')
        if order.update_status(new_status, user=self.request.user, note=note):
            return Response({'status': 'status updated'})
        return Response({'error': 'invalid status'}, status=400)

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        order = self.get_object()
        note_text = request.data.get('note')
        attachment = request.FILES.get('attachment')
        if note_text:
            order.add_note(user=self.request.user, note_text=note_text, attachment=attachment)
            return Response({'status': 'note added'})
        return Response({'error': 'note is required'}, status=400)

    @action(detail=True, methods=['post'])
    def update_tracking(self, request, pk=None):
        order = self.get_object()
        tracking_number = request.data.get('tracking_number')
        if tracking_number:
            order.update_tracking(tracking_number)
            return Response({'status': 'tracking updated'})
        return Response({'error': 'tracking number is required'}, status=400)

class OrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Restreindre les éléments aux commandes de l'utilisateur connecté, sauf pour les superusers
        if self.request.user.is_superuser:
            return OrderItem.objects.all()
        return OrderItem.objects.filter(order__customer=self.request.user)

class OrderNoteViewSet(viewsets.ModelViewSet):
    serializer_class = OrderNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Restreindre les notes aux commandes de l'utilisateur connecté, sauf pour les superusers
        if self.request.user.is_superuser:
            return OrderNote.objects.all()
        return OrderNote.objects.filter(order__customer=self.request.user)