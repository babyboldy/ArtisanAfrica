from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import UserAddress
from .serializers import (
    UserSerializer, 
    UserAddressSerializer, 
    CreateUserSerializer, 
    UpdateUserSerializer,
    ChangePasswordSerializer,
    CreateUpdateUserAddressSerializer
)
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

User = get_user_model()

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Permission pour vérifier si l'utilisateur est un administrateur ou un super administrateur.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_admin or request.user.is_super_admin)

class IsSuperAdmin(permissions.BasePermission):
    """
    Permission pour vérifier si l'utilisateur est un super administrateur.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_super_admin

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission pour vérifier si l'utilisateur est le propriétaire ou un administrateur.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_super_admin:
            return True
        if request.user.is_admin:
            return obj.created_by == request.user or obj == request.user
        return obj == request.user

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user_type', 'account_status', 'email_confirmed']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['date_joined', 'last_login', 'total_orders', 'total_spent']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateUserSerializer
        return UserSerializer

    def get_permissions(self):
        """
        Définir les permissions en fonction de l'action.
        """
        if self.action == 'me':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['list']:
            permission_classes = [IsAdminOrSuperAdmin]
        elif self.action in ['create']:
            # Permettre aux admin/superadmin de créer des utilisateurs, ou autoriser l'inscription publique
            permission_classes = [permissions.AllowAny]  # À modifier selon vos besoins
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Filtrer les utilisateurs en fonction des permissions de l'utilisateur connecté.
        """
        # Vérifier si c'est une requête swagger
        if getattr(self, 'swagger_fake_view', False):
            return User.objects.none()
            
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()
            
        if user.is_super_admin:
            return User.objects.all()
        elif user.is_admin:
            return User.objects.filter(
                models.Q(created_by=user) | models.Q(id=user.id)
            )
        return User.objects.filter(id=user.id)

    @swagger_auto_schema(
        responses={
            status.HTTP_200_OK: UserSerializer(),
        },
        operation_description="Récupérer le profil de l'utilisateur connecté",
        operation_summary="Mon profil"
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Endpoint pour récupérer les informations de l'utilisateur connecté.
        """
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @swagger_auto_schema(
        request_body=ChangePasswordSerializer,
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Mot de passe modifié avec succès",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                    'message': openapi.Schema(type=openapi.TYPE_STRING)
                })
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description="Erreur de validation",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                    'old_password': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_STRING)),
                    'new_password': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_STRING)),
                    'confirm_password': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_STRING))
                })
            )
        },
        operation_description="Changer le mot de passe de l'utilisateur connecté",
        operation_summary="Changer de mot de passe"
    )
    @action(detail=False, methods=['post'], serializer_class=ChangePasswordSerializer, permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """
        Endpoint pour changer le mot de passe de l'utilisateur connecté.
        """
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': _("Mot de passe modifié avec succès.")}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('year', openapi.IN_QUERY, description="Année (YYYY)", type=openapi.TYPE_INTEGER),
            openapi.Parameter('month', openapi.IN_QUERY, description="Mois (1-12)", type=openapi.TYPE_INTEGER)
        ],
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Dépenses mensuelles",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                    'monthly_spending': openapi.Schema(type=openapi.TYPE_NUMBER)
                })
            )
        },
        operation_description="Récupérer les dépenses mensuelles d'un utilisateur",
        operation_summary="Dépenses mensuelles"
    )
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsOwnerOrAdmin])
    def monthly_spending(self, request, pk=None):
        """
        Endpoint pour récupérer les dépenses mensuelles d'un utilisateur.
        """
        user = self.get_object()
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        try:
            if year is not None:
                year = int(year)
            if month is not None:
                month = int(month)
        except ValueError:
            return Response(
                {'error': _("Les paramètres 'year' et 'month' doivent être des nombres entiers.")},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        spending = user.get_monthly_spending(year=year, month=month)
        return Response({'monthly_spending': spending})

class UserAddressViewSet(viewsets.ModelViewSet):
    queryset = UserAddress.objects.all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['address_type', 'is_default', 'country', 'city']
    ordering_fields = ['is_default', 'city', 'country']
    ordering = ['-is_default', 'id']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CreateUpdateUserAddressSerializer
        return UserAddressSerializer

    def get_permissions(self):
        """
        Définir les permissions pour les adresses.
        Seul l'utilisateur propriétaire de l'adresse peut la modifier ou la supprimer.
        """
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """
        Filtrer les adresses pour n'afficher que celles de l'utilisateur connecté.
        """
        # Vérifier si c'est une requête swagger
        if getattr(self, 'swagger_fake_view', False):
            return UserAddress.objects.none()
            
        if not self.request.user.is_authenticated:
            return UserAddress.objects.none()
            
        return UserAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Associer l'adresse à l'utilisateur connecté lors de la création.
        """
        serializer.save(user=self.request.user)

    @swagger_auto_schema(
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Liste des adresses par type",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                    'BILLING': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                    'SHIPPING': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                    'BOTH': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT))
                })
            )
        },
        operation_description="Récupérer les adresses groupées par type",
        operation_summary="Adresses par type"
    )
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """
        Endpoint pour récupérer les adresses groupées par type.
        """
        addresses = self.get_queryset()
        
        # Grouper les adresses par type
        result = {
            'BILLING': UserAddressSerializer(addresses.filter(address_type='BILLING'), many=True).data,
            'SHIPPING': UserAddressSerializer(addresses.filter(address_type='SHIPPING'), many=True).data,
            'BOTH': UserAddressSerializer(addresses.filter(address_type='BOTH'), many=True).data
        }
        
        return Response(result)

    @swagger_auto_schema(
        responses={
            status.HTTP_200_OK: openapi.Response(
                description="Adresses par défaut",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                    'BILLING': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'SHIPPING': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'BOTH': openapi.Schema(type=openapi.TYPE_OBJECT)
                })
            )
        },
        operation_description="Récupérer les adresses par défaut",
        operation_summary="Adresses par défaut"
    )
    @action(detail=False, methods=['get'])
    def default(self, request):
        """
        Endpoint pour récupérer les adresses par défaut de l'utilisateur.
        """
        addresses = self.get_queryset().filter(is_default=True)
        
        # Récupérer les adresses par défaut par type
        result = {
            'BILLING': None,
            'SHIPPING': None,
            'BOTH': None
        }
        
        for address_type in ['BILLING', 'SHIPPING', 'BOTH']:
            address = addresses.filter(address_type=address_type).first()
            if address:
                result[address_type] = UserAddressSerializer(address).data
        
        return Response(result)