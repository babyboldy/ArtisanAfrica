# notifications/serializers.py
from rest_framework import serializers
from .models import Notification, NotificationGroup
from django.contrib.auth import get_user_model

User = get_user_model()

class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'type', 'level', 'user', 'user_id',
            'is_read', 'is_archived', 'related_object_id', 'related_object_type',
            'action_url', 'icon', 'created_at', 'read_at', 'archived_at'
        ]

class NotificationGroupSerializer(serializers.ModelSerializer):
    notifications = NotificationSerializer(many=True, read_only=True)
    notification_ids = serializers.PrimaryKeyRelatedField(
        queryset=Notification.objects.all(), source='notifications', many=True, write_only=True, required=False
    )

    class Meta:
        model = NotificationGroup
        fields = ['id', 'title', 'notifications', 'notification_ids', 'created_at']