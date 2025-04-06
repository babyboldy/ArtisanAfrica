# notifications/views.py
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.utils import timezone
from django.urls import reverse
from .models import Notification
from orders.models import Order
from django.db.models import Q


def is_staff(user):
    return user.is_staff



@login_required
@user_passes_test(is_staff)
def admin_notifications(request):
    # Récupérer toutes les notifications non archivées pour l'utilisateur connecté
    notifications = Notification.objects.filter(user=request.user, is_archived=False).order_by('-created_at')

    # Nombre de notifications non lues
    unread_count = notifications.filter(is_read=False).count()

    # Filtrage par type de notification
    notification_filter = request.GET.get('filter', 'all')
    if notification_filter == 'unread':
        notifications = notifications.filter(is_read=False)
    elif notification_filter != 'all':
        notifications = notifications.filter(type=notification_filter)

    # Recherche dans les notifications (titre ou message)
    search_query = request.GET.get('search', '')
    if search_query:
        notifications = notifications.filter(
            Q(title__icontains=search_query) | Q(message__icontains=search_query)
        )

    # Filtrage par période
    time_filter = request.GET.get('time', 'all')
    if time_filter != 'all':
        today = timezone.now().date()
        if time_filter == 'today':
            notifications = notifications.filter(created_at__date=today)
        elif time_filter == 'week':
            start_of_week = today - timezone.timedelta(days=today.weekday())
            notifications = notifications.filter(created_at__date__gte=start_of_week)
        elif time_filter == 'month':
            notifications = notifications.filter(created_at__month=today.month, created_at__year=today.year)

    # Récupérer les détails de la commande pour les notifications de type "order"
    for notif in notifications:
        if notif.type == 'order' and notif.related_object_id:
            try:
                notif.order = Order.objects.get(id=notif.related_object_id)
            except Order.DoesNotExist:
                notif.order = None
        else:
            notif.order = None

    # Compter les notifications par type pour les filtres
    all_notifications = Notification.objects.filter(user=request.user, is_archived=False)
    type_counts = {type_code: all_notifications.filter(type=type_code).count() for type_code, _ in Notification.TYPE_CHOICES}

    # Séparer les notifications lues et non lues
    unread_notifications = notifications.filter(is_read=False)
    read_notifications = notifications.filter(is_read=True)

    # Contexte pour le template
    context = {
        'notifications': notifications,  # Toutes les notifications filtrées
        'unread_notifications': unread_notifications,  # Notifications non lues
        'read_notifications': read_notifications,  # Notifications lues
        'total_count': all_notifications.count(),  # Nombre total de notifications
        'unread_count': unread_count,  # Nombre de notifications non lues
        'notification_types': Notification.TYPE_CHOICES,  # Types de notifications disponibles
        'type_counts': type_counts,  # Nombre de notifications par type
        'current_filter': notification_filter,  # Filtre actuel (all, unread, order, stock, system)
        'search_query': search_query,  # Terme de recherche
        'time_filter': time_filter,  # Filtre de période (all, today, week, month)
    }

    return render(request, 'dashboard/notifications.html', context)







@login_required
@user_passes_test(lambda u: u.is_staff)
def notification_detail(request, notification_id):
    # Récupérer la notification
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)

    # Marquer la notification comme lue si ce n'est pas déjà fait
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()

    # Récupérer la commande associée si la notification est de type "order"
    order = None
    items = []
    if notification.type == 'order' and notification.related_object_id:
        try:
            order = Order.objects.get(id=notification.related_object_id)
            items = order.items.all()  # Récupérer les articles de la commande
        except Order.DoesNotExist:
            order = None

    # Contexte pour le template
    context = {
        'notification': notification,
        'order': order,
        'items': items,
    }

    return render(request, 'dashboard/notification_detail.html', context)





@login_required
@user_passes_test(is_staff)
def unread_notifications_api(request):
    """
    API endpoint pour récupérer les notifications non lues
    """
    unread_notifications = Notification.objects.filter(
        user=request.user,
        is_read=False,
        is_archived=False
    ).order_by('-created_at')[:5]  # Limiter aux 5 plus récentes pour la performance
    
    notifications_data = []
    for notification in unread_notifications:
        notifications_data.append({
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'created_at': notification.created_at.strftime('%d/%m/%Y %H:%M'),
            'type': notification.type,
            'icon': get_notification_icon(notification.type),
            'is_read': notification.is_read,
        })
    
    return JsonResponse({
        'unread_count': unread_notifications.count(),
        'notifications': notifications_data,
        'success': True
    })

# Fonction utilitaire pour obtenir l'icône appropriée selon le type de notification
def get_notification_icon(notification_type):
    icons = {
        'order': 'fa-shopping-bag',
        'stock': 'fa-box',
        'system': 'fa-cog',
        'customer': 'fa-user',
        'payment': 'fa-credit-card'
    }
    return icons.get(notification_type, 'fa-bell')






@login_required
@user_passes_test(is_staff)
def toggle_notification_read(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    if notification.is_read:
        notification.is_read = False
        notification.read_at = None
        messages.success(request, 'Notification marquée comme non lue.')
    else:
        notification.is_read = True
        notification.read_at = timezone.now()
        messages.success(request, 'Notification marquée comme lue.')
    notification.save()
    
    # Revenir à la page précédente ou à la liste des notifications
    redirect_url = request.META.get('HTTP_REFERER')
    if not redirect_url:
        redirect_url = reverse('admin_notifications')
    return redirect(redirect_url)



@login_required
@user_passes_test(is_staff)
def mark_all_read(request):
    if request.method == 'POST':
        unread_notifications = Notification.objects.filter(user=request.user, is_read=False)
        count = unread_notifications.count()
        for notification in unread_notifications:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save()
        
        # Si la requête est en AJAX, retourner une réponse JSON
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.content_type == 'application/json':
            return JsonResponse({
                'success': True,
                'message': f'{count} notifications ont été marquées comme lues.'
            })
        
        # Sinon, rediriger avec un message
        messages.success(request, f'{count} notifications ont été marquées comme lues.')
        return redirect('admin_notifications')
    
    # Méthode GET non autorisée
    return JsonResponse({'success': False, 'message': 'Méthode non autorisée'}, status=405)




@login_required
@user_passes_test(is_staff)
def delete_notification(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.delete()
    messages.success(request, 'La notification a été supprimée.')
    
    redirect_url = request.META.get('HTTP_REFERER')
    if not redirect_url:
        redirect_url = reverse('admin_notifications')
    return redirect(redirect_url)

@login_required
@user_passes_test(is_staff)
def clear_all_notifications(request):
    if request.method == 'POST':
        notifications = Notification.objects.filter(user=request.user, is_archived=False)
        count = notifications.count()
        notifications.delete()
        messages.success(request, f'{count} notifications ont été supprimées.')
    return redirect('admin_notifications')

@login_required
@user_passes_test(is_staff)
def archive_notification(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.is_archived = True
    notification.archived_at = timezone.now()
    notification.save()
    messages.success(request, 'La notification a été archivée.')
    
    redirect_url = request.META.get('HTTP_REFERER')
    if not redirect_url:
        redirect_url = reverse('admin_notifications')
    return redirect(redirect_url)

