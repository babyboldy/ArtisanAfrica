# views.py
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.urls import reverse
from orders.models import Order, OrderItem, OrderNote
from products.models import Product
import csv
import xlsxwriter
from io import BytesIO
from datetime import datetime
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
import json
import uuid
import traceback
from decimal import Decimal
import os


@login_required
def admin_orders(request):
    orders = Order.objects.all().order_by('-created_at')
    return render(request, 'dashboard/order.html', {'orders': orders})


@login_required
def client_order_detail(request, order_id):
    order = get_object_or_404(Order, id=order_id, customer=request.user)
    return render(request, 'orders/client_order_detail.html', {'order': order})


@login_required
def export_orders_xls(request):
    # Créer un nouveau workbook en mémoire
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # Styles pour l'en-tête
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#F8F9FA',
        'border': 1,
        'align': 'center'
    })

    # En-têtes
    headers = ['ID', 'Client', 'Date', 'Total', 'Statut', 'Paiement']
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)

    # Données
    orders = Order.objects.all().order_by('-created_at')
    for row, order in enumerate(orders, start=1):
        worksheet.write(row, 0, order.order_number)
        worksheet.write(row, 1, order.customer.get_full_name())
        worksheet.write(row, 2, order.created_at.strftime('%d/%m/%Y'))
        worksheet.write(row, 3, float(order.total_amount))
        worksheet.write(row, 4, order.get_status_display())
        worksheet.write(row, 5, order.get_payment_status_display())

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
    # Créer un PDF en mémoire
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    # En-têtes
    data = [['ID', 'Client', 'Date', 'Total', 'Statut', 'Paiement']]
    
    # Données
    orders = Order.objects.all().order_by('-created_at')
    for order in orders:
        data.append([
            order.order_number,
            order.customer.get_full_name(),
            order.created_at.strftime('%d/%m/%Y'),
            f"{order.total_amount} €",
            order.get_status_display(),
            order.get_payment_status_display()
        ])

    # Créer le tableau
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)

    # Configuration de la réponse HTTP
    buffer.seek(0)
    filename = f'commandes_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf'
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


@login_required
def export_orders_csv(request):
    response = HttpResponse(content_type='text/csv')
    filename = f'commandes_{datetime.now().strftime("%Y%m%d_%H%M")}.csv'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    writer = csv.writer(response)
    writer.writerow(['ID', 'Client', 'Date', 'Total', 'Statut', 'Paiement'])
    
    orders = Order.objects.all().order_by('-created_at')
    for order in orders:
        writer.writerow([
            order.order_number,
            order.customer.get_full_name(),
            order.created_at.strftime('%d/%m/%Y'),
            order.total_amount,
            order.get_status_display(),
            order.get_payment_status_display()
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

        # Création de la commande
        order = Order.objects.create(
            order_number=order_number,
            customer=request.user,
            status='pending',
            payment_method=payment_method,
            payment_status='pending' if payment_method == 'delivery' else 'completed',
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
                            
                            # Vérifier si le stock est suffisant
                            if product.stock < quantity:
                                stock_errors.append(f"Stock insuffisant pour {product.name}. Disponible: {product.stock}, Demandé: {quantity}")
                                continue
                            
                            # Créer l'élément de commande
                            item = OrderItem.objects.create(
                                order=order,
                                product=product,
                                product_name=product.name,
                                product_sku=product.sku if hasattr(product, 'sku') else '',
                                quantity=quantity,
                                unit_price=product.price,
                                total_price=product.price * quantity,
                                options=data.get('options')
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
    # Récupération de la commande
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
        bottomMargin=72
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
    elements.append(Paragraph(f"Nom: {order.customer.get_full_name()}", styles['Normal']))
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
            options_text = ', '.join([f"{key}: {value}" for key, value in item.options.items()])
            product_name += f" ({options_text})"
        
        data.append([
            product_name,
            str(item.quantity),
            f"{item.unit_price} €",
            f"{item.total_price} €"
        ])
    
    # Ajout des totaux
    data.append(['', '', 'Sous-total', f"{order.subtotal} €"])
    data.append(['', '', 'TVA (20%)', f"{order.tax_amount} €"])
    data.append(['', '', 'Frais de livraison', f"{order.shipping_cost} €" if order.shipping_cost > 0 else "Gratuit"])
    data.append(['', '', 'TOTAL', f"{order.total_amount} €"])
    
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
    payment_method = "Carte bancaire" if order.payment_method == 'card' else "Paiement à la livraison" if order.payment_method == 'delivery' else order.get_payment_method_display()
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


# Fonction pour envoyer un e-mail de confirmation avec la facture
def send_order_confirmation_email(order_id):
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
    
    # Contenu du document
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
    elements.append(Paragraph(f"Nom: {order.customer.get_full_name()}", styles['Normal']))
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
            options_text = ', '.join([f"{key}: {value}" for key, value in item.options.items()])
            product_name += f" ({options_text})"
        
        data.append([
            product_name,
            str(item.quantity),
            f"{item.unit_price} €",
            f"{item.total_price} €"
        ])
    
    # Ajout des totaux
    data.append(['', '', 'Sous-total', f"{order.subtotal} €"])
    data.append(['', '', 'TVA (20%)', f"{order.tax_amount} €"])
    data.append(['', '', 'Frais de livraison', f"{order.shipping_cost} €" if order.shipping_cost > 0 else "Gratuit"])
    data.append(['', '', 'TOTAL', f"{order.total_amount} €"])
    
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
    payment_method = "Carte bancaire" if order.payment_method == 'card' else "Paiement à la livraison" if order.payment_method == 'delivery' else order.get_payment_method_display()
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
    order.save()
    
    return True

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