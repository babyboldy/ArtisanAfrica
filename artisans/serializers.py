# artisans/serializers.py
from rest_framework import serializers
from .models import Region, CraftType, Artisan, ArtisanApplication, ApplicationPhoto, Testimonial

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['id', 'name', 'slug']

class CraftTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CraftType
        fields = ['id', 'name', 'slug']

class ApplicationPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationPhoto
        fields = ['id', 'image', 'uploaded_at']

class ArtisanSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    craft_type = CraftTypeSerializer(read_only=True)
    region_id = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(), source='region', write_only=True, required=False
    )
    craft_type_id = serializers.PrimaryKeyRelatedField(
        queryset=CraftType.objects.all(), source='craft_type', write_only=True, required=False
    )

    class Meta:
        model = Artisan
        fields = [
            'id', 'user', 'name', 'region', 'region_id', 'country', 'craft_type', 'craft_type_id',
            'description', 'image', 'rating', 'created_at', 'is_active'
        ]

class ArtisanApplicationSerializer(serializers.ModelSerializer):
    craft_type = CraftTypeSerializer(read_only=True)
    craft_type_id = serializers.PrimaryKeyRelatedField(
        queryset=CraftType.objects.all(), source='craft_type', write_only=True, required=False
    )
    photos = ApplicationPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = ArtisanApplication
        fields = [
            'id', 'full_name', 'email', 'phone', 'country', 'craft_type', 'craft_type_id',
            'other_craft', 'experience', 'description', 'portfolio_url', 'photos',
            'terms_accepted', 'status', 'submitted_at'
        ]

class TestimonialSerializer(serializers.ModelSerializer):
    artisan = serializers.StringRelatedField(read_only=True)
    artisan_id = serializers.PrimaryKeyRelatedField(
        queryset=Artisan.objects.all(), source='artisan', write_only=True
    )

    class Meta:
        model = Testimonial
        fields = ['id', 'artisan', 'artisan_id', 'content', 'created_at', 'is_active']