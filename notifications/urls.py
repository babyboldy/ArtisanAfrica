# notifications/urls.py
from django.urls import path
from . import views


urlpatterns = [
    path('notifications/', views.admin_notifications, name='admin_notifications'),
    path('toggle-read/<int:notification_id>/', views.toggle_notification_read, name='toggle_notification_read'),
    path('mark-all-read/', views.mark_all_read, name='mark_all_read'),
    path('notifications/unread/', views.unread_notifications_api, name='unread_notifications_api'),
    path('delete/<int:notification_id>/', views.delete_notification, name='delete_notification'),
    path('clear-all/', views.clear_all_notifications, name='clear_all_notifications'),
    path('archive/<int:notification_id>/', views.archive_notification, name='archive_notification'),
    path('detail/<int:notification_id>/', views.notification_detail, name='notification_detail'),
]