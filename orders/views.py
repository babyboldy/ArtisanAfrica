from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.utils import timezone
from django.urls import reverse
from django.core.paginator import Paginator
from .models import Order, OrderItem, OrderNote
from products.models import Product, ProductMedia
import csv
import xlsxwriter
from io import BytesIO
import json
from datetime import datetime, timedelta
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import uuid
import traceback
from decimal import Decimal
import os


@login_required
def admin_orders(request):
    # Récupération des paramètres de filtre
    status_filter = request.GET.get('status', '')
    payment_filter = request.GET.get('payment', '')
    date_filter = request.GET.get('date', '')
    search_query = request.GET.get('search', '')
    sort_by = request.GET.get('sort', '-created_at')
    
    # Construction de la requête de base avec select_related pour optimiser
    orders_query = Order.objects.select_related('customer').prefetch_related('items')
    
    # Appliquer les filtres
    if status_filter:
        orders_query = orders_query.filter(status=status_filter)
    
    if payment_filter:
        orders_query = orders_query.filter(payment_status=payment_filter)
    
    if date_filter:
        today = timezone.now().date()
        if date_filter == 'today':
            orders_query = orders_query.filter(created_at__date=today)
        elif date_filter == 'week':
            start_of_week = today - timedelta(days=today.weekday())
            orders_query = orders_query.filter(created_at__date__gte=start_of_week)
        elif date_filter == 'month':
            orders_query = orders_query.filter(
                created_at__year=today.year,
                created_at__month=today.month
            )
    
    if search_query:
        orders_query = orders_query.filter(
            order_number__icontains=search_query
        ) | orders_query.filter(
            customer__email__icontains=search_query
        )
    
    # Tri
    orders_query = orders_query.order_by(sort_by)
    
    # Pagination
    paginator = Paginator(orders_query, 20)  # 20 commandes par page
    page = request.GET.get('page', 1)
    try:
        orders = paginator.page(page)
    except:
        orders = paginator.page(1)
    
    # Statistiques pour le dashboard
    stats = {
        'pending': Order.objects.filter(status='pending').count(),
        'processing': Order.objects.filter(status='processing').count(),
        'shipped': Order.objects.filter(status='shipped').count(),
        'delivered': Order.objects.filter(status='delivered').count(),
        'cancelled': Order.objects.filter(status='cancelled').count(),
    }
    
    # Options pour les sélecteurs
    order_status_choices = Order.STATUS_CHOICES
    payment_status_choices = Order.PAYMENT_STATUS_CHOICES
    payment_method_choices = Order.PAYMENT_METHOD_CHOICES
    
    context = {
        'orders': orders,
        'stats': stats,
        'order_status_choices': order_status_choices,
        'payment_status_choices': payment_status_choices,
        'payment_method_choices': payment_method_choices,
        'current_status': status_filter,
        'current_payment': payment_filter,
        'current_date': date_filter,
        'search_query': search_query,
        'sort_by': sort_by
    }
    
    return render(request, 'dashboard/order.html', context)


@login_required
def admin_order_detail(request, order_id):
    order = get_object_or_404(Order, id=order_id)
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'update_status':
            new_status = request.POST.get('status')
            if new_status in dict(Order.STATUS_CHOICES):
                order.update_status(new_status, request.user)
                messages.success(request, f"Statut mis à jour: {order.get_status_display()}")
            else:
                messages.error(request, "Statut invalide")
                
        elif action == 'update_tracking':
            tracking_number = request.POST.get('tracking_number')
            order.tracking_number = tracking_number
            order.save(update_fields=['tracking_number', 'updated_at'])
            
            # Ajouter une note pour le numéro de suivi
            note_text = f"Numéro de suivi ajouté/modifié: {tracking_number}"
            OrderNote.objects.create(
                order=order,
                user=request.user,
                note=note_text
            )
            
            messages.success(request, "Numéro de suivi mis à jour")
            
        elif action == 'add_note':
            note_text = request.POST.get('note_text')
            attachment = request.FILES.get('attachment')
            
            if note_text:
                note = OrderNote.objects.create(
                    order=order,
                    user=request.user,
                    note=note_text,
                    attachment=attachment
                )
                messages.success(request, "Note ajoutée avec succès")
            else:
                messages.error(request, "Le texte de la note ne peut pas être vide")
        
        # Redirection vers la même page après le traitement
        return redirect('admin_order_detail', order_id=order.id)
    
    # Pour les requêtes GET, afficher les détails
    items = order.items.all()
    notes = order.notes.all().order_by('-created_at')
    
    # Historique des statuts à partir des notes
    status_history = []
    for note in notes:
        if "Statut modifié" in note.note:
            status_history.append({
                'date': note.created_at,
                'status': note.note.split("Statut modifié")[1].strip(),
                'user': note.user
            })
    
    context = {
        'order': order,
        'items': items,
        'notes': notes,
        'status_history': status_history
    }
    
    return render(request, 'dashboard/order_detail.html', context)


@login_required
def client_order_detail(request, order_id):
    order = get_object_or_404(Order, id=order_id, customer=request.user)
    return render(request, 'orders/client_order_detail.html', {'order': order})


@login_required
@require_http_methods(["POST"])
def update_order_status(request, order_id):
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Permission refusée'}, status=403)
        
    order = get_object_or_404(Order, id=order_id)
    new_status = request.POST.get('status')
    
    if not order.update_status(new_status, request.user):
        return JsonResponse({'success': False, 'error': 'Statut invalide'}, status=400)
    
    return JsonResponse({
        'success': True, 
        'status': order.status,
        'status_display': order.get_status_display(), 
        'status_code': order.status
    })


@login_required
@require_http_methods(["GET"])
def get_order_details(request, order_id):
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Permission refusée'}, status=403)
    
    try:
        order = Order.objects.select_related('customer').prefetch_related(
            'items', 'items__product', 'items__product__media'
        ).get(id=order_id)
        
        # Récupérer les articles avec leurs images
        items = []
        for item in order.items.all():
            # Récupérer la première image du produit
            product_image = None
            if item.product:
                media = item.product.media.filter(media_type='image').first()
                if media:
                    product_image = request.build_absolute_uri(media.file.url)
                elif hasattr(item.product, 'image') and item.product.image:
                    product_image = request.build_absolute_uri(item.product.image.url)
            
            items.append({
                'id': item.id,
                'product_id': item.product.id if item.product else None,
                'product_name': item.product_name,
                'product_sku': item.product_sku,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price),
                'options': item.options,
                'product_image': product_image,
                # or request.build_absolute_uri(static('images/default-product.png'))
            })

        # Récupérer les notes
        notes = []
        for note in order.notes.all().order_by('-created_at'):
            notes.append({
                'id': note.id,
                'note': note.note,
                'created_at': note.created_at.strftime('%d %b %Y %H:%M'),
                'user': note.user.get_full_name() if note.user else 'Système',
                'attachment': request.build_absolute_uri(note.attachment.url) if note.attachment else None
            })
        
        # Préparer les données de la commande
        order_data = {
            'id': order.id,
            'order_number': order.order_number,
            'customer': {
                'id': order.customer.id,
                'name': order.customer.get_full_name() or order.customer.username,
                'email': order.customer.email,
                'date_joined': order.customer.date_joined.strftime('%b %Y'),
                'orders_count': order.customer.orders.count()
            },
            'status': order.status,
            'status_display': order.get_status_display(),
            'created_at': order.created_at.strftime('%d %b %Y %H:%M'),
            'updated_at': order.updated_at.strftime('%d %b %Y %H:%M'),
            'payment_method': order.payment_method,
            'payment_method_display': order.get_payment_method_display(),
            'payment_status': order.payment_status,
            'payment_status_display': order.get_payment_status_display(),
            'shipping_address': order.shipping_address_text,
            'billing_address': order.billing_address_text,
            'subtotal': float(order.subtotal),
            'shipping_cost': float(order.shipping_cost),
            'tax_amount': float(order.tax_amount),
            'total_amount': float(order.total_amount),
            'tracking_number': order.tracking_number or 'Non disponible',
            'estimated_delivery_date': order.estimated_delivery_date.strftime('%d %b %Y') if order.estimated_delivery_date else 'Non disponible',
            'items': items,
            'notes': notes,
            'invoice_url': reverse('generate_invoice', args=[order.id])
        }
        
        return JsonResponse({'success': True, 'order': order_data})
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Commande non trouvée'}, status=404)
    except Exception as e:
        print(f"Erreur lors de la récupération des détails de la commande {order_id}: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def update_tracking_number(request, order_id):
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Permission refusée'}, status=403)
        
    order = get_object_or_404(Order, id=order_id)
    tracking_number = request.POST.get('tracking_number', '').strip()
    
    order.tracking_number = tracking_number
    order.save(update_fields=['tracking_number', 'updated_at'])
    
    # Ajouter une note
    note_text = f"Numéro de suivi mis à jour: {tracking_number or 'Non défini'}"
    OrderNote.objects.create(
        order=order,
        user=request.user,
        note=note_text
    )
    
    return JsonResponse({
        'success': True, 
        'tracking_number': tracking_number or 'Non disponible'
    })


@login_required
@require_http_methods(["POST"])
def add_order_note(request, order_id):
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Permission refusée'}, status=403)
        
    order = get_object_or_404(Order, id=order_id)
    note_text = request.POST.get('note_text', '').strip()
    
    if not note_text:
        return JsonResponse({'success': False, 'error': 'Le texte de la note ne peut pas être vide'}, status=400)
    
    # Gérer un éventuel fichier joint
    attachment = request.FILES.get('attachment')
    
    # Créer la note
    note = OrderNote.objects.create(
        order=order,
        user=request.user,
        note=note_text,
        attachment=attachment
    )
    
    # Formatter la date pour la réponse
    formatted_date = note.created_at.strftime('%d %b %Y %H:%M')
    
    return JsonResponse({
        'success': True,
        'note_id': note.id,
        'note_text': note.note,
        'date': formatted_date,
        'user': request.user.get_full_name() or request.user.username,
        'attachment': note.attachment.url if note.attachment else None
    })


@login_required
@require_http_methods(["POST"])
def batch_update_orders(request):
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Permission refusée'}, status=403)
    
    # Récupérer les IDs des commandes sélectionnées
    order_ids_str = request.POST.get('order_ids', '')
    try:
        if order_ids_str.startswith('['):
            # Format JSON
            order_ids = json.loads(order_ids_str)
        else:
            # Format séparé par virgules
            order_ids = [id.strip() for id in order_ids_str.split(',') if id.strip()]
    except json.JSONDecodeError:
        order_ids = [id.strip() for id in order_ids_str.split(',') if id.strip()]
    
    new_status = request.POST.get('status')
    note_text = request.POST.get('note', '').strip()
    
    if not order_ids:
        return JsonResponse({'success': False, 'error': 'Aucune commande sélectionnée'}, status=400)
    
    if new_status not in dict(Order.STATUS_CHOICES):
        return JsonResponse({'success': False, 'error': 'Statut invalide'}, status=400)
    
    # Mettre à jour les commandes
    updated_count = 0
    for order_id in order_ids:
        try:
            order = Order.objects.get(id=order_id)
            if order.update_status(new_status, request.user, 
                                   f"{note_text} (Mise à jour groupée: statut = {order.get_status_display()})" if note_text else None):
                updated_count += 1
        except Order.DoesNotExist:
            continue
        except Exception as e:
            print(f"Erreur lors de la mise à jour de la commande {order_id}: {e}")
    
    return JsonResponse({
        'success': True,
        'updated_count': updated_count,
        'message': f"{updated_count} commande(s) mise(s) à jour avec succès"
    })


@login_required
def export_orders_xls(request):
    # Filtres optionnels
    status_filter = request.GET.get('status', '')
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    
    # Construire la requête de base
    orders_query = Order.objects.all()
    
    # Appliquer les filtres s'ils sont fournis
    if status_filter and status_filter in dict(Order.STATUS_CHOICES):
        orders_query = orders_query.filter(status=status_filter)
    
    if date_from:
        try:
            date_from = datetime.strptime(date_from, '%Y-%m-%d')
            orders_query = orders_query.filter(created_at__gte=date_from)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to = datetime.strptime(date_to, '%Y-%m-%d')
            # Ajouter un jour pour inclure les commandes de cette journée
            date_to = date_to + timedelta(days=1)
            orders_query = orders_query.filter(created_at__lt=date_to)
        except ValueError:
            pass
    
    # Récupérer les commandes filtrées et triées
    orders = orders_query.order_by('-created_at')
    
    # Créer un nouveau workbook en mémoire
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Commandes")

    # Styles pour l'en-tête
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#F8F9FA',
        'border': 1,
        'align': 'center'
    })
    
    # Format pour les dates
    date_format = workbook.add_format({'num_format': 'dd/mm/yyyy'})
    
    # Format pour les montants
    money_format = workbook.add_format({'num_format': '# ##0.00 F CFA'})

    # En-têtes
    headers = ['ID', 'N° Commande', 'Client', 'Email', 'Date', 'Total', 'Statut', 'Paiement', 'Méthode']
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)

    # Données
    for row, order in enumerate(orders, start=1):
        worksheet.write(row, 0, order.id)
        worksheet.write(row, 1, order.order_number)
        worksheet.write(row, 2, order.customer.get_full_name() or order.customer.username)
        worksheet.write(row, 3, order.customer.email)
        worksheet.write_datetime(row, 4, order.created_at.replace(tzinfo=None), date_format)
        worksheet.write_number(row, 5, float(order.total_amount), money_format)
        worksheet.write(row, 6, order.get_status_display())
        worksheet.write(row, 7, order.get_payment_status_display())
        worksheet.write(row, 8, order.get_payment_method_display())

    # Ajuster la largeur des colonnes
    for i, header in enumerate(headers):
        worksheet.set_column(i, i, max(len(header) + 2, 12))

    workbook.close()
    output.seek(0)

    # Configuration de la réponse HTTP
    filename = f'commandes_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx'
    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


@login_required
def export_orders_pdf(request):
    # Filtres similaires à ceux de la fonction XLS
    status_filter = request.GET.get('status', '')
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    
    # Filtrer les commandes
    orders_query = Order.objects.all()
    
    if status_filter and status_filter in dict(Order.STATUS_CHOICES):
        orders_query = orders_query.filter(status=status_filter)
    
    if date_from:
        try:
            date_from = datetime.strptime(date_from, '%Y-%m-%d')
            orders_query = orders_query.filter(created_at__gte=date_from)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to = datetime.strptime(date_to, '%Y-%m-%d')
            date_to = date_to + timedelta(days=1)
            orders_query = orders_query.filter(created_at__lt=date_to)
        except ValueError:
            pass
    
    orders = orders_query.order_by('-created_at')
    
    # Créer un PDF en mémoire
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title="Liste des commandes")
    elements = []

    # Styles
    styles = getSampleStyleSheet()
    title_style = styles["Heading1"]
    subtitle_style = styles["Heading2"]
    normal_style = styles["Normal"]
    
    # Ajouter un titre
    elements.append(Paragraph("Liste des Commandes", title_style))
    elements.append(Spacer(1, 12))
    
    # Ajouter la date d'exportation
    current_date = datetime.now().strftime("%d/%m/%Y %H:%M")
    elements.append(Paragraph(f"Exporté le: {current_date}", normal_style))
    elements.append(Spacer(1, 12))
    
    # Ajouter des informations sur les filtres appliqués si présents
    filter_info = []
    if status_filter:
        status_display = dict(Order.STATUS_CHOICES).get(status_filter, status_filter)
        filter_info.append(f"Statut: {status_display}")
    if date_from:
        filter_info.append(f"Du: {date_from.strftime('%d/%m/%Y')}")
    if date_to:
        original_date_to = date_to - timedelta(days=1)
        filter_info.append(f"Au: {original_date_to.strftime('%d/%m/%Y')}")
    
    if filter_info:
        elements.append(Paragraph("Filtres appliqués: " + ", ".join(filter_info), normal_style))
        elements.append(Spacer(1, 12))
    
    # Ajouter le nombre de commandes
    elements.append(Paragraph(f"Nombre de commandes: {orders.count()}", normal_style))
    elements.append(Spacer(1, 20))

    # En-têtes du tableau
    data = [['N° Commande', 'Client', 'Date', 'Total', 'Statut', 'Paiement']]
    
    # Données
    for order in orders:
        data.append([
            order.order_number,
            order.customer.get_full_name() or order.customer.username,
            order.created_at.strftime('%d/%m/%Y'),
            f"{order.total_amount} F CFA",
            order.get_status_display(),
            order.get_payment_status_display()
        ])

    # Créer le tableau
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ALIGN', (3, 1), (3, -1), 'RIGHT'),  # Aligner la colonne Total à droite
    ]))
    
    elements.append(table)
    
    # Compilation du document
    doc.build(elements)

    # Configuration de la réponse HTTP
    buffer.seek(0)
    filename = f'commandes_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf'
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


@login_required
def export_orders_csv(request):
    # Filtres
    status_filter = request.GET.get('status', '')
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    
    # Filtrer les commandes
    orders_query = Order.objects.all()
    
    if status_filter and status_filter in dict(Order.STATUS_CHOICES):
        orders_query = orders_query.filter(status=status_filter)
    
    if date_from:
        try:
            date_from = datetime.strptime(date_from, '%Y-%m-%d')
            orders_query = orders_query.filter(created_at__gte=date_from)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to = datetime.strptime(date_to, '%Y-%m-%d')
            date_to = date_to + timedelta(days=1)
            orders_query = orders_query.filter(created_at__lt=date_to)
        except ValueError:
            pass
    
    orders = orders_query.order_by('-created_at')
    
    # Configuration de la réponse
    response = HttpResponse(content_type='text/csv')
    filename = f'commandes_{datetime.now().strftime("%Y%m%d_%H%M")}.csv'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    # Configuration du CSV
    writer = csv.writer(response, delimiter=';')  # Utiliser ; pour meilleure compatibilité avec Excel
    writer.writerow(['ID', 'Numéro de commande', 'Client', 'Email', 'Date', 'Total', 'Statut', 'Paiement', 'Méthode de paiement'])
    
    for order in orders:
        writer.writerow([
            order.id,
            order.order_number,
            order.customer.get_full_name() or order.customer.username,
            order.customer.email,
            order.created_at.strftime('%d/%m/%Y %H:%M'),
            str(order.total_amount).replace('.', ','),  # Format français
            order.get_status_display(),
            order.get_payment_status_display(),
            order.get_payment_method_display()
        ])
    
    return response


@login_required
def payment_page(request):
    # Préparez les adresses de l'utilisateur pour pré-remplir le formulaire
    context = {
        'user_addresses': request.user.addresses.all(),
        'default_address': request.user.addresses.filter(is_default=True).first()
    }
    # Désactivation du cache pour les ressources statiques
    response = render(request, 'website/payment.html', context)
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def process_payment(request):
    try:
        # Log complet des données POST pour le débogage
        print("Données POST reçues:", request.POST)
        
        # Récupération de la méthode de paiement
        payment_method = request.POST.get('payment_method')
        if not payment_method:
            messages.error(request, "Veuillez sélectionner une méthode de paiement.")
            return redirect('payment')
        
        # Récupération des articles du panier
        cart_items_data = request.POST.getlist('cart_items[]')
        print(f"Nombre d'articles reçus: {len(cart_items_data)}")
        
        # Déboguer le contenu du panier
        for i, item in enumerate(cart_items_data):
            print(f"Article {i}: {item}")
        
        # Vérifier que le panier n'est pas vide
        if not cart_items_data:
            messages.error(request, "Votre panier est vide.")
            return redirect('payment')

        # Création d'un numéro de commande unique
        order_number = f"CMD-{uuid.uuid4().hex[:8].upper()}"

        # Récupération de l'adresse de livraison
        shipping_address = {
            'street': request.POST.get('street_address'),
            'apartment': request.POST.get('apartment', ''),
            'city': request.POST.get('city'),
            'postal_code': request.POST.get('postal_code'),
            'country': request.POST.get('country')
        }

        # Vérification des champs obligatoires de l'adresse
        required_address_fields = ['street', 'city', 'postal_code', 'country']
        missing_fields = [field for field in required_address_fields if not shipping_address[field]]
        if missing_fields:
            messages.error(request, "Veuillez remplir tous les champs obligatoires de l'adresse.")
            return redirect('payment')

        # Calcul direct des montants depuis les champs cachés du formulaire
        subtotal = Decimal(request.POST.get('subtotal', '0.00'))
        tax_amount = Decimal(request.POST.get('tax_amount', '0.00'))
        shipping_cost = Decimal(request.POST.get('shipping_cost', '0.00'))
        total_amount = Decimal(request.POST.get('total_amount', '0.00'))

        # Déterminer le statut de paiement initial
        initial_payment_status = 'pending' if payment_method == 'delivery' else 'completed'

        # Création de la commande
        order = Order.objects.create(
            order_number=order_number,
            customer=request.user,
            status='pending',
            payment_method=payment_method,
            payment_status=initial_payment_status,
            shipping_address_text=f"{shipping_address['street']} {shipping_address['apartment']}, {shipping_address['postal_code']} {shipping_address['city']}, {shipping_address['country']}",
            billing_address_text=f"{shipping_address['street']} {shipping_address['apartment']}, {shipping_address['postal_code']} {shipping_address['city']}, {shipping_address['country']}",
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            tax_amount=tax_amount,
            total_amount=total_amount,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            estimated_delivery_date=timezone.now().date() + timezone.timedelta(days=5)
        )

        # Liste pour stocker les éventuelles erreurs de stock
        stock_errors = []
        
        # Vérifiez si le panier est vide
        if not cart_items_data:
            print("ATTENTION: Aucun article trouvé dans le panier!")
            # Créez un élément factice pour debug
            OrderItem.objects.create(
                order=order,
                product_name="Test produit (debug)",
                quantity=1,
                unit_price=Decimal('10.00'),
                total_price=Decimal('10.00')
            )
        else:
            # Création des éléments de commande et mise à jour du stock
            created_items = 0
            
            for item_json in cart_items_data:
                try:
                    print(f"Traitement de l'article: {item_json}")
                    data = json.loads(item_json)
                    product_id = data.get('id')
                    
                    # Forcer la conversion en string puis en int si possible
                    if product_id:
                        try:
                            product_id = int(str(product_id).strip())
                        except (ValueError, TypeError):
                            product_id = 0
                    else:
                        product_id = 0
                        
                    quantity = int(data.get('quantity', 1))
                    price = Decimal(str(data.get('price', '0.00')))
                    product_name = data.get('name', 'Produit inconnu')
                    
                    print(f"Données extraites: ID={product_id}, Name={product_name}, Qty={quantity}, Price={price}")
                    
                    # Récupérer le produit 
                    if product_id > 0:
                        try:
                            product = Product.objects.get(id=product_id)
                            
                            # Récupérer l'image du produit
                            product_image = None
                            product_media = ProductMedia.objects.filter(product=product, media_type='image').first()
                            if product_media:
                                product_image = product_media.file.url
                                
                            item = OrderItem.objects.create(
                                order=order,
                                product=product,
                                product_name=product.name,
                                product_sku=product.sku if hasattr(product, 'sku') else '',
                                quantity=quantity,
                                unit_price=product.price,
                                total_price=product.price * quantity,
                                options=data.get('options'),
                                product_image=product_image  # Ajoutez l'URL de l'image
                            )
                            created_items += 1
                            print(f"Élément de commande créé avec succès: {item}")
                            
                            # Mettre à jour le stock
                            product.stock -= quantity
                            product.save()
                        except Product.DoesNotExist:
                            # Produit non trouvé
                            item = OrderItem.objects.create(
                                order=order,
                                product_name=product_name,
                                product_sku=data.get('sku', ''),
                                quantity=quantity,
                                unit_price=price,
                                total_price=price * quantity,
                                options=data.get('options')
                            )
                            created_items += 1
                            print(f"Élément de commande créé sans référence produit: {item}")
                    else:
                        # Pour les articles sans ID produit valide
                        item = OrderItem.objects.create(
                            order=order,
                            product_name=product_name,
                            product_sku=data.get('sku', ''),
                            quantity=quantity,
                            unit_price=price,
                            total_price=price * quantity,
                            options=data.get('options')
                        )
                        created_items += 1
                        print(f"Élément de commande créé (ID invalide): {item}")
                        
                except json.JSONDecodeError as e:
                    print(f"Erreur de décodage JSON: {e}")
                    print(f"Données brutes: {item_json}")
                    
                except Exception as e:
                    print(f"Erreur pour un article: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            print(f"Total d'articles créés: {created_items}")
            
            # Si aucun article n'a été créé, essayez une approche différente
            if created_items == 0:
                print("Aucun article créé, tentative de récupération du panier depuis localStorage")
                # Créer au moins un article pour éviter une commande vide
                OrderItem.objects.create(
                    order=order,
                    product_name="Article non identifiable",
                    quantity=1,
                    unit_price=Decimal('1.00'),
                    total_price=Decimal('1.00')
                )

        # Si des erreurs de stock ont été détectées, annuler la commande
        if stock_errors:
            order.delete()
            for error in stock_errors:
                messages.error(request, error)
            return redirect('payment')

        # Ajouter les instructions de livraison, si renseignées
        instructions = request.POST.get('delivery_instructions')
        if instructions:
            OrderNote.objects.create(order=order, user=request.user, note=instructions)

        # Enregistrer téléphone et email en cas de paiement à la livraison
        if payment_method == 'delivery':
            phone = request.POST.get('phone')
            email = request.POST.get('email')
            if phone and email:  # Vérification des champs obligatoires
                order.payment_details = {'delivery_phone': phone, 'delivery_email': email}
                order.save()

        # Vérification finale
        item_count = order.items.count()
        print(f"Vérification finale: {item_count} articles dans la commande")

        messages.success(request, 'Commande enregistrée avec succès!')
        
        # Envoyer l'email de confirmation
        try:
            process_order_completion(order.id)
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'email: {e}")
        
        # Vider le panier en supprimant la clé du localStorage via JavaScript
        response = redirect(reverse('payment_confirmation', args=[order_number]))
        response.set_cookie('clear_cart', 'true')
        return response
            
    except Exception as e:
        # Enregistrement de l'erreur pour débogage
        print(f"ERREUR COMPLÈTE: {e}")
        import traceback
        traceback.print_exc()
        # Message d'erreur pour l'utilisateur
        messages.error(request, "Erreur lors du traitement de la commande. Veuillez réessayer.")
        # Redirection vers la page de paiement
        return redirect('payment')


@login_required
def payment_confirmation(request, order_number):
    try:
        # Récupérer la commande correspondant au numéro et à l'utilisateur connecté
        order = Order.objects.get(order_number=order_number, customer=request.user)
        
        # Vérification des articles de la commande
        items = order.items.all()
        print(f"Commande #{order_number} - Nombre d'articles: {items.count()}")
        for item in items:
            print(f"Article: {item.product_name}, Quantité: {item.quantity}, Prix total: {item.total_price}")
        
        # Si aucun article n'est trouvé mais que la commande existe, afficher un avertissement
        if items.count() == 0:
            print("ATTENTION: La commande existe mais ne contient aucun article!")
        
        # Préparation du contexte pour le template
        context = {
            'order': order,
            'items': items
        }
        
        # Rendu du template avec le contexte
        response = render(request, 'website/confirmation.html', context)
        
        # Script pour vider le panier après confirmation
        response.set_cookie('clear_cart', 'true')
        return response
    except Order.DoesNotExist:
        # Si la commande n'existe pas, afficher un message d'erreur
        messages.error(request, "Commande non trouvée.")
        return redirect('payment')


# Fonction pour générer une facture PDF
@login_required
def generate_invoice(request, order_id):
    try:
        # Récupération de la commande avec validation de l'accès
        if request.user.is_staff:
            order = get_object_or_404(Order, id=order_id)
        else:
            order = get_object_or_404(Order, id=order_id, customer=request.user)
        
        # Création du buffer pour le PDF
        buffer = BytesIO()
        
        # Création du document PDF
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
            title=f"Facture {order.order_number}"
        )
        
        # Contenu du document
        elements = []
        
        # Styles
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='Center', alignment=1))
        styles.add(ParagraphStyle(
            name='Invoice_Title',
            fontName='Helvetica-Bold',
            fontSize=16,
            alignment=1,
            spaceAfter=12
        ))
        
        # Titre
        elements.append(Paragraph(f"FACTURE N° {order.order_number}", styles['Invoice_Title']))
        elements.append(Spacer(1, 12))
        
        # Date et infos société
        date_text = f"Date: {order.created_at.strftime('%d/%m/%Y')}"
        company_name = "E-SHOP SAS"
        company_address = "123 Rue du Commerce, 75001 Paris"
        company_info = f"SIRET: 123 456 789 00010 - TVA: FR12 123 456 789"
        
        elements.append(Paragraph(date_text, styles['Normal']))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(company_name, styles['Heading2']))
        elements.append(Paragraph(company_address, styles['Normal']))
        elements.append(Paragraph(company_info, styles['Normal']))
        elements.append(Spacer(1, 24))
        
        # Informations client
        elements.append(Paragraph("Informations client:", styles['Heading3']))
        elements.append(Paragraph(f"Nom: {order.customer.get_full_name() or order.customer.username}", styles['Normal']))
        elements.append(Paragraph(f"Email: {order.customer.email}", styles['Normal']))
        elements.append(Paragraph(f"Adresse de livraison:", styles['Normal']))
        elements.append(Paragraph(order.shipping_address_text.replace('\n', '<br/>'), styles['Normal']))
        elements.append(Spacer(1, 24))
        
        # Informations commande
        elements.append(Paragraph("Détails de la commande:", styles['Heading3']))
        elements.append(Spacer(1, 12))
        
        # Tableau des articles
        data = [
            ['Produit', 'Quantité', 'Prix unitaire', 'Total']
        ]
        
        # Ajout des produits dans le tableau
        for item in order.items.all():
            product_name = item.product_name
            if item.options:
                # Convertir les options en format lisible
                try:
                    if isinstance(item.options, str):
                        options_dict = json.loads(item.options)
                    else:
                        options_dict = item.options
                    options_text = ', '.join([f"{key}: {value}" for key, value in options_dict.items()])
                    product_name += f" ({options_text})"
                except (json.JSONDecodeError, AttributeError):
                    pass  # Ignorer les erreurs de conversion
            
            data.append([
                product_name,
                str(item.quantity),
                f"{item.unit_price} F CFA",
                f"{item.total_price} F CFA"
            ])
        
        # Ajout des totaux
        data.append(['', '', 'Sous-total', f"{order.subtotal} F CFA"])
        data.append(['', '', 'TVA (20%)', f"{order.tax_amount} F CFA"])
        data.append(['', '', 'Frais de livraison', f"{order.shipping_cost} F CFA" if order.shipping_cost > 0 else "Gratuit"])
        data.append(['', '', 'TOTAL', f"{order.total_amount} F CFA"])
        
        # Création du tableau
        table = Table(data, colWidths=[8*cm, 2*cm, 4*cm, 4*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.gray),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -5), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('SPAN', (0, -4), (1, -4)),
            ('SPAN', (0, -3), (1, -3)),
            ('SPAN', (0, -2), (1, -2)),
            ('SPAN', (0, -1), (1, -1)),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (2, -4), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (2, -1), (-1, -1), colors.lightgrey),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 24))
        
        # Informations de paiement
        payment_method = order.get_payment_method_display()
        elements.append(Paragraph(f"Méthode de paiement: {payment_method}", styles['Normal']))
        elements.append(Paragraph(f"Statut du paiement: {order.get_payment_status_display()}", styles['Normal']))
        elements.append(Spacer(1, 12))
        
        # Pied de page
        elements.append(Paragraph("Nous vous remercions pour votre commande!", styles['Center']))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph("Pour toute question relative à votre commande, veuillez contacter notre service client.", styles['Center']))
        elements.append(Paragraph("service-client@e-shop.com | +33 (0)1 23 45 67 89", styles['Center']))
        
        # Construction du document
        doc.build(elements)
        
        # Récupération du contenu du buffer
        pdf = buffer.getvalue()
        buffer.close()
        
        # Création de la réponse HTTP
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="facture_{order.order_number}.pdf"'
        
        return response
    except Exception as e:
        messages.error(request, f"Erreur lors de la génération de la facture: {str(e)}")
        if request.user.is_staff:
            return redirect('admin_orders')
        else:
            return redirect('client_orders')


# Fonction pour envoyer un e-mail de confirmation avec la facture
def send_order_confirmation_email(order_id):
    try:
        # Récupération de la commande
        order = Order.objects.get(id=order_id)
        
        # Génération de la facture
        buffer = BytesIO()
        
        # Création du document PDF (même code que ci-dessus)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Contenu du document (même code que ci-dessus)
        elements = []
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='Center', alignment=1))
        styles.add(ParagraphStyle(
            name='Invoice_Title',
            fontName='Helvetica-Bold',
            fontSize=16,
            alignment=1,
            spaceAfter=12
        ))
        
        # Titre
        elements.append(Paragraph(f"FACTURE N° {order.order_number}", styles['Invoice_Title']))
        elements.append(Spacer(1, 12))
        
        # Date et infos société
        date_text = f"Date: {order.created_at.strftime('%d/%m/%Y')}"
        company_name = "E-SHOP SAS"
        company_address = "123 Rue du Commerce, 75001 Paris"
        company_info = f"SIRET: 123 456 789 00010 - TVA: FR12 123 456 789"
        
        elements.append(Paragraph(date_text, styles['Normal']))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(company_name, styles['Heading2']))
        elements.append(Paragraph(company_address, styles['Normal']))
        elements.append(Paragraph(company_info, styles['Normal']))
        elements.append(Spacer(1, 24))
        
        # Informations client
        elements.append(Paragraph("Informations client:", styles['Heading3']))
        elements.append(Paragraph(f"Nom: {order.customer.get_full_name() or order.customer.username}", styles['Normal']))
        elements.append(Paragraph(f"Email: {order.customer.email}", styles['Normal']))
        elements.append(Paragraph(f"Adresse de livraison:", styles['Normal']))
        elements.append(Paragraph(order.shipping_address_text.replace('\n', '<br/>'), styles['Normal']))
        elements.append(Spacer(1, 24))
        
        # Informations commande
        elements.append(Paragraph("Détails de la commande:", styles['Heading3']))
        elements.append(Spacer(1, 12))
        
        # Tableau des articles
        data = [
            ['Produit', 'Quantité', 'Prix unitaire', 'Total']
        ]
        
        # Ajout des produits dans le tableau
        for item in order.items.all():
            product_name = item.product_name
            if item.options:
                try:
                    if isinstance(item.options, str):
                        options_dict = json.loads(item.options)
                    else:
                        options_dict = item.options
                    options_text = ', '.join([f"{key}: {value}" for key, value in options_dict.items()])
                    product_name += f" ({options_text})"
                except (json.JSONDecodeError, AttributeError):
                    pass
            
            data.append([
                product_name,
                str(item.quantity),
                f"{item.unit_price} F CFA",
                f"{item.total_price} F CFA"
            ])
        
        # Ajout des totaux
        data.append(['', '', 'Sous-total', f"{order.subtotal} F CFA"])
        data.append(['', '', 'TVA (20%)', f"{order.tax_amount} F CFA"])
        data.append(['', '', 'Frais de livraison', f"{order.shipping_cost} F CFA" if order.shipping_cost > 0 else "Gratuit"])
        data.append(['', '', 'TOTAL', f"{order.total_amount} F CFA"])
        
        # Création du tableau
        table = Table(data, colWidths=[8*cm, 2*cm, 4*cm, 4*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.gray),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -5), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('SPAN', (0, -4), (1, -4)),
            ('SPAN', (0, -3), (1, -3)),
            ('SPAN', (0, -2), (1, -2)),
            ('SPAN', (0, -1), (1, -1)),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (2, -4), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (2, -1), (-1, -1), colors.lightgrey),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 24))
        
        # Informations de paiement
        payment_method = order.get_payment_method_display()
        elements.append(Paragraph(f"Méthode de paiement: {payment_method}", styles['Normal']))
        elements.append(Paragraph(f"Statut du paiement: {order.get_payment_status_display()}", styles['Normal']))
        elements.append(Spacer(1, 12))
        
        # Pied de page
        elements.append(Paragraph("Nous vous remercions pour votre commande!", styles['Center']))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph("Pour toute question relative à votre commande, veuillez contacter notre service client.", styles['Center']))
        elements.append(Paragraph("service-client@e-shop.com | +33 (0)1 23 45 67 89", styles['Center']))
        
        # Construction du document
        doc.build(elements)
        
        # Récupération du contenu du buffer
        pdf = buffer.getvalue()
        buffer.close()
        
        # Préparation de l'e-mail
        subject = f'Confirmation de votre commande #{order.order_number}'
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = order.customer.email
        
        # Création du contenu HTML de l'e-mail
        html_content = render_to_string(
            'website/emails/order_confirmation_email_template.html',
            {
                'order': order,
                'items': order.items.all(),
                'user': order.customer,
                'site_url': settings.SITE_URL,
            }
        )
        
        # Création du contenu texte de l'e-mail
        text_content = strip_tags(html_content)
        
        # Création de l'e-mail
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        
        # Attachement de la facture
        msg.attach(f'facture_{order.order_number}.pdf', pdf, 'application/pdf')
        
        # Envoi de l'e-mail
        msg.send()
        
        # Mise à jour du statut de la commande
        order.email_sent = True
        order.save(update_fields=['email_sent'])
        
        return True
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de confirmation pour la commande {order_id}: {e}")
        traceback.print_exc()
        return False

# Fonction pour être appelée après la création d'une commande
def process_order_completion(order_id):
    try:
        # Envoi de l'email de confirmation
        send_order_confirmation_email(order_id)
        return True
    except Exception as e:
        print(f"Erreur lors du traitement de la commande {order_id}: {e}")
        traceback.print_exc()
        return False


@login_required
@require_http_methods(["POST"])
def change_order_status(request):
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Permission refusée'}, status=403)
        
    try:
        order_id = request.POST.get('order_id')
        new_status = request.POST.get('status')
        
        if not order_id or not new_status:
            return JsonResponse({'success': False, 'error': 'Paramètres manquants'}, status=400)
            
        order = Order.objects.get(id=order_id)
        old_status = order.status
        
        if new_status not in dict(Order.STATUS_CHOICES):
            return JsonResponse({'success': False, 'error': 'Statut invalide'}, status=400)
            
        if not order.update_status(new_status, request.user):
            return JsonResponse({'success': False, 'error': 'Mise à jour échouée'}, status=400)
        
        return JsonResponse({
            'success': True, 
            'status': order.status,
            'status_display': order.get_status_display()
        })
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Commande non trouvée'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    


@login_required
@require_http_methods(["POST"])
def change_payment_status(request):
    if not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Permission refusée'}, status=403)
        
    try:
        order_id = request.POST.get('order_id')
        new_status = request.POST.get('status')
        
        if not order_id or not new_status:
            return JsonResponse({'success': False, 'error': 'Paramètres manquants'}, status=400)
            
        order = Order.objects.get(id=order_id)
        
        if new_status not in dict(Order.PAYMENT_STATUS_CHOICES):
            return JsonResponse({'success': False, 'error': 'Statut de paiement invalide'}, status=400)
            
        old_status = order.payment_status
        order.payment_status = new_status
        order.save(update_fields=['payment_status', 'updated_at'])
        
        # Ajouter une note
        note_text = f"Statut de paiement modifié de {dict(Order.PAYMENT_STATUS_CHOICES)[old_status]} à {dict(Order.PAYMENT_STATUS_CHOICES)[new_status]}"
        OrderNote.objects.create(
            order=order,
            user=request.user,
            note=note_text
        )
        
        return JsonResponse({
            'success': True, 
            'payment_status': order.payment_status,
            'payment_status_display': order.get_payment_status_display()
        })
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Commande non trouvée'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
    





from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Order
from decimal import Decimal

def order_detail_json(request, order_id):
    order = get_object_or_404(Order, pk=order_id)

    # Génération des items de la commande
    items = []
    for item in order.get_order_items():
        items.append({
            'product_name': item.product_name,
            'product_image': item.product_image or '',  # lien complet si possible
            'product_sku': item.product_sku,
            'quantity': item.quantity,
            'unit_price': float(item.unit_price),
            'total_price': float(item.total_price),
        })

    # Données client
    customer = order.customer
    customer_info = {
        'email': customer.email,
        'name': f"{customer.first_name} {customer.last_name}".strip() or customer.username,
        'date_joined': customer.date_joined.strftime("%d %b %Y"),
        'orders_count': customer.orders.count(),
        'image': customer.profile_picture_url
    }

    # Notes
    notes_data = []
    for note in order.notes.all():
        notes_data.append({
            'user': note.user.get_full_name() if note.user else 'Système',
            'note': note.note,
            'date': note.created_at.strftime("%d %b %Y %H:%M"),
            'attachment': note.attachment.url if note.attachment else None
        })

    data = {
        'success': True,
        'order': {
            'id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'status_display': order.get_status_display(),
            'payment_status': order.payment_status,
            'payment_status_display': order.get_payment_status_display(),
            'payment_method': order.payment_method,
            'payment_method_display': order.get_payment_method_display(),
            'tracking_number': order.tracking_number,
            'created_at': order.created_at.strftime("%d %b %Y %H:%M"),
            'estimated_delivery_date': order.estimated_delivery_date.strftime("%d %b %Y") if order.estimated_delivery_date else None,
            'shipping_address': order.shipping_address_text,
            'billing_address': order.billing_address_text,
            'subtotal': float(order.subtotal),
            'tax_amount': float(order.tax_amount),
            'shipping_cost': float(order.shipping_cost),
            'total_amount': float(order.total_amount),
            'items': items,
            'customer': customer_info,
            'notes': notes_data,
        }
    }

    return JsonResponse(data)
