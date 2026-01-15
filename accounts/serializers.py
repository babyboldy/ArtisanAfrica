from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserAddress
from django.utils.translation import gettext_lazy as _
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = [
            'id', 'address_type', 'street_address', 'apartment', 'city',
            'state', 'postal_code', 'country', 'is_default'
        ]
        read_only_fields = ['id']

    def validate(self, data):
        """
        Validation personnalisée pour s'assurer qu'il n'y a qu'une seule adresse par défaut par type.
        """
        if data.get('is_default'):
            user = self.context['request'].user
            address_type = data.get('address_type')
            if address_type:
                existing_default = UserAddress.objects.filter(
                    user=user, 
                    address_type=address_type, 
                    is_default=True
                )
                
                if self.instance:
                    existing_default = existing_default.exclude(id=self.instance.id)
                
                if existing_default.exists():
                    raise serializers.ValidationError({
                        'is_default': _(f"Il existe déjà une adresse par défaut de type {dict(UserAddress.ADDRESS_TYPES).get(address_type)} pour cet utilisateur.")
                    })
        return data

class CreateUpdateUserAddressSerializer(UserAddressSerializer):
    """
    Serializer spécifique pour la création et la mise à jour d'adresses,
    avec une validation plus stricte.
    """
    class Meta(UserAddressSerializer.Meta):
        extra_kwargs = {
            'street_address': {'required': True},
            'city': {'required': True},
            'postal_code': {'required': True},
            'country': {'required': True},
            'address_type': {'required': True},
        }

class UserSerializer(serializers.ModelSerializer):
    addresses = UserAddressSerializer(many=True, read_only=True)
    profile_picture_url = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField(source='get_full_name')
    is_admin = serializers.ReadOnlyField()
    is_super_admin = serializers.ReadOnlyField()
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all(), message=_("Cet email est déjà utilisé."))]
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'user_type', 'first_name', 'last_name', 'gender',
            'birth_date', 'profile_picture', 'profile_picture_url', 'phone',
            'company_name', 'profession', 'total_orders', 'total_spent',
            'last_order_date', 'account_status', 'email_confirmed', 'date_joined',
            'last_login', 'full_name', 'is_admin', 'is_super_admin', 'addresses'
        ]
        read_only_fields = [
            'id', 'total_orders', 'total_spent', 'last_order_date', 'account_status',
            'email_confirmed', 'date_joined', 'last_login', 'full_name', 'is_admin',
            'is_super_admin', 'addresses', 'user_type'  # user_type en lecture seule
        ]

    def validate(self, data):
        """
        Validation supplémentaire si nécessaire.
        """
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return data
            
        # Seul un super administrateur peut modifier le type d'utilisateur
        if 'user_type' in data and request.user.is_authenticated:
            if not request.user.is_super_admin:
                raise serializers.ValidationError({
                    'user_type': _("Seul un super administrateur peut modifier le type d'utilisateur.")
                })
                
        return data

class CreateUserSerializer(UserSerializer):
    """
    Serializer spécifique pour la création d'utilisateurs.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirmation = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['password', 'password_confirmation']
        read_only_fields = [field for field in UserSerializer.Meta.read_only_fields if field != 'user_type']

    def validate(self, data):
        """
        Vérifier que les deux mots de passe correspondent.
        """
        data = super().validate(data)
        
        if data.get('password') != data.get('password_confirmation'):
            raise serializers.ValidationError({
                'password_confirmation': _("Les mots de passe ne correspondent pas.")
            })
            
        return data
        
    def create(self, validated_data):
        """
        Créer un nouvel utilisateur avec un mot de passe.
        """
        validated_data.pop('password_confirmation', None)
        password = validated_data.pop('password', None)
        
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            # Si ce n'est pas un super admin, définir le type d'utilisateur à CLIENT
            if not request.user.is_super_admin:
                validated_data['user_type'] = 'CLIENT'
            
            # Définir l'utilisateur créateur
            validated_data['created_by'] = request.user
        
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

class UpdateUserSerializer(UserSerializer):
    """
    Serializer spécifique pour la mise à jour d'utilisateurs.
    """
    password = serializers.CharField(
        write_only=True,
        required=False,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['password']
    
    def update(self, instance, validated_data):
        """
        Mettre à jour un utilisateur existant.
        """
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer pour le changement de mot de passe.
    """
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(_("Le mot de passe actuel est incorrect."))
        return value
        
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': _("Les nouveaux mots de passe ne correspondent pas.")
            })
        return data
    
    
    
    
    
    