from .models import Notification

def unread_notifications(request):
    if request.user.is_authenticated and request.user.is_staff:
        unread_notifications = Notification.objects.filter(user=request.user, is_read=False).order_by('-created_at')[:5]
        unread_count = unread_notifications.count()
    else:
        unread_notifications = []
        unread_count = 0

    return {
        'unread_notifications': unread_notifications,
        'unread_notifications_count': unread_count
    }
