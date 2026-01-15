# apropos/serializers.py
from rest_framework import serializers
from .models import TeamMember, CompanyValue, Testimonial, AboutContent, ProcessStep

class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMember
        fields = ['id', 'name', 'position', 'bio', 'image', 'order', 'is_active', 'created_at', 'updated_at']

class CompanyValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyValue
        fields = ['id', 'title', 'description', 'icon', 'order', 'is_active']

class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'title', 'location', 'content', 'image', 'is_active', 'created_at']

class AboutContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutContent
        fields = [
            'id', 'title', 'subtitle', 'history_title', 'history_content',
            'mission_title', 'mission_content', 'process_title', 'team_title',
            'team_intro', 'cta_title', 'cta_content'
        ]

class ProcessStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessStep
        fields = ['id', 'title', 'description', 'order', 'is_active']