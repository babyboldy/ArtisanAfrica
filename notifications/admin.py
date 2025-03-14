# notifications/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Notification, NotificationGroup

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'type',
        'level',
        'user',
        'is_read',
        'is_archived',
        'created_at'
    ]
    list_filter = [
        'type',
        'level',
        'is_read',
        'is_archived',
        'created_at'
    ]
    search_fields = [
        'title',
        'message',
        'user__email',
        'user__first_name',
        'user__last_name'
    ]
    readonly_fields = ['created_at', 'read_at', 'archived_at']
    actions = ['mark_as_read', 'archive_notifications']

    fieldsets = (
        (_('Informations'), {
            'fields': ('title', 'message', 'type', 'level', 'icon')
        }),
        (_('Destinataire et état'), {
            'fields': ('user', 'is_read', 'is_archived')
        }),
        (_('Action'), {
            'fields': ('action_url', 'related_object_type', 'related_object_id')
        }),
        (_('Dates'), {
            'fields': ('created_at', 'read_at', 'archived_at'),
            'classes': ('collapse',)
        })
    )

    def mark_as_read(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_read=True, read_at=timezone.now())
    mark_as_read.short_description = _("Marquer comme lu")

    def archive_notifications(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_archived=True, archived_at=timezone.now())
    archive_notifications.short_description = _("Archiver les notifications")

@admin.register(NotificationGroup)
class NotificationGroupAdmin(admin.ModelAdmin):
    list_display = ['title', 'created_at', 'notification_count']
    search_fields = ['title']
    filter_horizontal = ['notifications']

    def notification_count(self, obj):
        return obj.notifications.count()
    notification_count.short_description = _("Nombre de notifications")