# artisans/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.core.paginator import Paginator
from django.contrib import messages
from django.db.models import Q
from .models import Artisan, Region, CraftType, ArtisanApplication, ApplicationPhoto, Testimonial
from django.http import JsonResponse

def artisans_list(request):
    # Get all artisans
    artisans = Artisan.objects.filter(is_active=True)

    # Filtering
    region_filter = request.GET.get('region', 'all')
    craft_filter = request.GET.get('craft', 'all')
    search_query = request.GET.get('search', '')

    if region_filter != 'all':
        artisans = artisans.filter(region__slug=region_filter)
    
    if craft_filter != 'all':
        artisans = artisans.filter(craft_type__slug=craft_filter)
    
    if search_query:
        artisans = artisans.filter(
            Q(name__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(country__icontains=search_query)
        )

    # Pagination
    paginator = Paginator(artisans, 6)  # 6 artisans per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    # Get regions and craft types for filters
    regions = Region.objects.all()
    craft_types = CraftType.objects.all()

    # Get testimonials
    testimonials = Testimonial.objects.filter(is_active=True)

    context = {
        'artisans': page_obj,
        'regions': regions,
        'craft_types': craft_types,
        'testimonials': testimonials,
        'region_filter': region_filter,
        'craft_filter': craft_filter,
        'search_query': search_query,
    }
    return render(request, 'website/artisans.html', context)

def artisan_detail(request, artisan_id):
    artisan = get_object_or_404(Artisan, id=artisan_id, is_active=True)
    
    # Récupérer les produits de l'artisan s'ils existent
    products = None
    if hasattr(artisan, 'products'):
        products = artisan.products.filter(is_active=True)[:6]  # Limitez à 6 produits
    
    # Trouver des artisans similaires (même région ou même type d'artisanat)
    similar_artisans = Artisan.objects.filter(is_active=True)
    if artisan.region:
        similar_artisans = similar_artisans.filter(region=artisan.region)
    elif artisan.craft_type:
        similar_artisans = similar_artisans.filter(craft_type=artisan.craft_type)
    
    # Exclure l'artisan actuel et limiter à 3 résultats
    similar_artisans = similar_artisans.exclude(id=artisan.id)[:3]
    
    context = {
        'artisan': artisan,
        'products': products,
        'similar_artisans': similar_artisans,
    }
    
    return render(request, 'website/artisan_detail.html', context)

# def artisan_application(request):
    if request.method == 'POST':
        # Extract form data
        full_name = request.POST.get('full_name', '').strip()
        email = request.POST.get('email', '').strip()
        phone = request.POST.get('phone', '').strip()
        country = request.POST.get('country', '').strip()
        craft_type = request.POST.get('craft_type', '').strip()
        other_craft = request.POST.get('other_craft', '').strip()
        experience = request.POST.get('experience', '').strip()
        description = request.POST.get('description', '').strip()
        portfolio_url = request.POST.get('portfolio_url', '').strip()
        terms_accepted = request.POST.get('terms_accepted') == 'on'

        # Validation
        errors = {}
        if not full_name:
            errors['full_name'] = 'Ce champ est requis.'
        if not email:
            errors['email'] = 'Ce champ est requis.'
        elif '@' not in email or '.' not in email:
            errors['email'] = 'Adresse email invalide.'
        if not phone:
            errors['phone'] = 'Ce champ est requis.'
        if not country:
            errors['country'] = 'Ce champ est requis.'
        if not craft_type:
            errors['craft_type'] = 'Ce champ est requis.'
        if craft_type == 'Autre' and not other_craft:

# Correction avec des guillemets doubles à l'extérieur :
            errors['other_craft'] = "Veuillez préciser votre type d'artisanat."

            errors['experience'] = 'Ce champ est requis.'
        if not description:
            errors['description'] = 'Ce champ est requis.'
        if not terms_accepted:
            errors['terms_accepted'] = 'Vous devez accepter les conditions.'

        # Handle photos
        photos = request.FILES.getlist('photos')
        max_photos = 3
        max_size = 5 * 1024 * 1024  # 5MB
        if not photos:
            errors['photos'] = 'Au moins une photo est requise.'
        elif len(photos) > max_photos:
            errors['photos'] = f"Vous ne pouvez uploader que {max_photos} photos maximum."
        else:
            for photo in photos:
                if photo.size > max_size:
                    errors['photos'] = f"La taille de l'image {photo.name} dépasse 5MB."
                elif not photo.content_type.startswith('image'):
                    errors['photos'] = f"Le fichier {photo.name} n'est pas une image valide."

        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)

        # Save application
        application = ArtisanApplication(
            full_name=full_name,
            email=email,
            phone=phone,
            country=country,
            craft_type=craft_type,
            other_craft=other_craft,
            experience=experience,
            description=description,
            portfolio_url=portfolio_url,
            terms_accepted=terms_accepted,
        )
        application.save()

        # Save photos
        for photo in photos:
            application_photo = ApplicationPhoto.objects.create(image=photo)
            application.photos.add(application_photo)

        messages.success(request, 'Votre candidature a été envoyée avec succès!')
        return JsonResponse({'success': True, 'message': 'Votre candidature a été envoyée avec succès! Nous vous contacterons bientôt.'})

    # Pour les requêtes GET, rediriger vers la page artisans
    return redirect('artisans_list')







# def artisan_application(request):
    if request.method == 'POST':
        # Extract form data
        full_name = request.POST.get('full_name', '').strip()
        email = request.POST.get('email', '').strip()
        phone = request.POST.get('phone', '').strip()
        country = request.POST.get('country', '').strip()
        craft_type = request.POST.get('craft_type', '').strip()
        other_craft = request.POST.get('other_craft', '').strip()
        experience = request.POST.get('experience', '').strip()
        description = request.POST.get('description', '').strip()
        portfolio_url = request.POST.get('portfolio_url', '').strip()
        terms_accepted = request.POST.get('terms_accepted') == 'on'

        # Validation
        errors = {}
        if not full_name:
            errors['full_name'] = 'Ce champ est requis.'
        if not email:
            errors['email'] = 'Ce champ est requis.'
        elif '@' not in email or '.' not in email:
            errors['email'] = 'Adresse email invalide.'
        if not phone:
            errors['phone'] = 'Ce champ est requis.'
        if not country:
            errors['country'] = 'Ce champ est requis.'
        if not craft_type:
            errors['craft_type'] = 'Ce champ est requis.'
        if craft_type == 'Autre' and not other_craft:
            errors['other_craft'] = "Veuillez préciser votre type d'artisanat."
        if not experience:
            errors['experience'] = 'Ce champ est requis.'
        if not description:
            errors['description'] = 'Ce champ est requis.'
        if not terms_accepted:
            errors['terms_accepted'] = 'Vous devez accepter les conditions.'

        # Handle photos
        photos = request.FILES.getlist('photos')
        max_photos = 3
        max_size = 5 * 1024 * 1024  # 5MB
        if not photos:
            errors['photos'] = 'Au moins une photo est requise.'
        elif len(photos) > max_photos:
            errors['photos'] = f"Vous ne pouvez uploader que {max_photos} photos maximum."
        else:
            for photo in photos:
                if photo.size > max_size:
                    errors['photos'] = f"La taille de l'image {photo.name} dépasse 5MB."
                elif not photo.content_type.startswith('image'):
                    errors['photos'] = f"Le fichier {photo.name} n'est pas une image valide."

        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)

        # Récupérer l'objet CraftType si nécessaire
        craft_type_obj = None
        if craft_type != 'Autre':
            try:
                craft_type_obj = CraftType.objects.get(id=craft_type)
            except CraftType.DoesNotExist:
                pass

        # Save application
        application = ArtisanApplication(
            full_name=full_name,
            email=email,
            phone=phone,
            country=country,
            craft_type=craft_type_obj,
            other_craft=other_craft if craft_type == 'Autre' else '',
            experience=experience,
            description=description,
            portfolio_url=portfolio_url,
            terms_accepted=terms_accepted,
        )
        application.save()

        # Save photos
        for photo in photos:
            application_photo = ApplicationPhoto.objects.create(image=photo)
            application.photos.add(application_photo)

        # Envoyer un email de notification
        try:
            # Préparer les détails de l'email
            subject = f"Nouvelle candidature artisan: {full_name}"
            
            # Créer le contenu de l'email
            email_content = f"""
            Une nouvelle candidature pour devenir artisan a été soumise sur votre plateforme.
            
            Informations sur le candidat:
            ---------------------------
            Nom complet: {full_name}
            Email: {email}
            Téléphone: {phone}
            Pays: {country}
            Type d'artisanat: {craft_type_obj.name if craft_type_obj else other_craft + ' (Autre)'}
            Expérience: {experience}
            Portfolio: {portfolio_url if portfolio_url else 'Non fourni'}
            
            Description fournie par le candidat:
            ---------------------------
            {description}
            
            Le candidat a également soumis {len(photos)} photo(s).
            
            Vous pouvez consulter cette candidature dans l'interface d'administration.
            """
            
            # Destinataire: votre adresse email
            from_email = 'majokossonou@gmail.com'  # Utilise l'email configuré dans les paramètres
            recipient_list = ['majokossonou@gmail.com']  # Votre adresse email pour recevoir les notifications
            
            # Envoyer l'email
            from django.core.mail import send_mail
            send_mail(
                subject,
                email_content,
                from_email,
                recipient_list,
                fail_silently=True,  # En cas d'erreur, ne pas faire échouer la sauvegarde
            )
        except Exception as e:
            # Journaliser l'erreur mais continuer le processus
            print(f"Erreur lors de l'envoi de l'email: {e}")
            # Vous pourriez enregistrer cette erreur dans un journal plus approprié

        messages.success(request, 'Votre candidature a été envoyée avec succès!')
        return JsonResponse({'success': True, 'message': 'Votre candidature a été envoyée avec succès! Nous vous contacterons bientôt.'})

    # Pour les requêtes GET, rediriger vers la page artisans
    return redirect('artisans_list')

def artisan_application(request):
    if request.method == 'POST':
        # Extract form data
        full_name = request.POST.get('full_name', '').strip()
        email = request.POST.get('email', '').strip()
        phone = request.POST.get('phone', '').strip()
        country = request.POST.get('country', '').strip()
        craft_type = request.POST.get('craft_type', '').strip()
        other_craft = request.POST.get('other_craft', '').strip()
        experience = request.POST.get('experience', '').strip()
        description = request.POST.get('description', '').strip()
        portfolio_url = request.POST.get('portfolio_url', '').strip()
        terms_accepted = request.POST.get('terms_accepted') == 'on'

        # Validation
        errors = {}
        if not full_name:
            errors['full_name'] = 'Ce champ est requis.'
        if not email:
            errors['email'] = 'Ce champ est requis.'
        elif '@' not in email or '.' not in email:
            errors['email'] = 'Adresse email invalide.'
        if not phone:
            errors['phone'] = 'Ce champ est requis.'
        if not country:
            errors['country'] = 'Ce champ est requis.'
        if not craft_type:
            errors['craft_type'] = 'Ce champ est requis.'
        if craft_type == 'Autre' and not other_craft:
            errors['other_craft'] = "Veuillez préciser votre type d'artisanat."
        if not experience:
            errors['experience'] = 'Ce champ est requis.'
        if not description:
            errors['description'] = 'Ce champ est requis.'
        if not terms_accepted:
            errors['terms_accepted'] = 'Vous devez accepter les conditions.'

        # Handle photos
        photos = request.FILES.getlist('photos')
        max_photos = 3
        max_size = 5 * 1024 * 1024  # 5MB
        if not photos:
            errors['photos'] = 'Au moins une photo est requise.'
        elif len(photos) > max_photos:
            errors['photos'] = f"Vous ne pouvez uploader que {max_photos} photos maximum."
        else:
            for photo in photos:
                if photo.size > max_size:
                    errors['photos'] = f"La taille de l'image {photo.name} dépasse 5MB."
                elif not photo.content_type.startswith('image'):
                    errors['photos'] = f"Le fichier {photo.name} n'est pas une image valide."

        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)

        # Récupérer l'objet CraftType si nécessaire
        craft_type_obj = None
        if craft_type != 'Autre':
            try:
                craft_type_obj = CraftType.objects.get(id=craft_type)
            except CraftType.DoesNotExist:
                pass

        # Save application
        application = ArtisanApplication(
            full_name=full_name,
            email=email,
            phone=phone,
            country=country,
            craft_type=craft_type_obj,
            other_craft=other_craft if craft_type == 'Autre' else '',
            experience=experience,
            description=description,
            portfolio_url=portfolio_url,
            terms_accepted=terms_accepted,
        )
        application.save()

        # Save photos
        for photo in photos:
            application_photo = ApplicationPhoto.objects.create(image=photo)
            application.photos.add(application_photo)

        # Envoyer un email de notification à l'administrateur
        try:
            # Préparer les détails de l'email pour l'admin
            admin_subject = f"Nouvelle candidature artisan: {full_name}"
            
            # Créer le contenu de l'email pour l'admin
            admin_email_content = f"""
            Une nouvelle candidature pour devenir artisan a été soumise sur votre plateforme.
            
            Informations sur le candidat:
            ---------------------------
            Nom complet: {full_name}
            Email: {email}
            Téléphone: {phone}
            Pays: {country}
            Type d'artisanat: {craft_type_obj.name if craft_type_obj else other_craft + ' (Autre)'}
            Expérience: {experience}
            Portfolio: {portfolio_url if portfolio_url else 'Non fourni'}
            
            Description fournie par le candidat:
            ---------------------------
            {description}
            
            Le candidat a également soumis {len(photos)} photo(s).
            
            Vous pouvez consulter cette candidature dans l'interface d'administration.
            """
            
            # Destinataire: votre adresse email
            from_email = 'majokossonou@gmail.com'  # Utilise l'email configuré dans les paramètres
            admin_recipients = ['majokossonou@gmail.com']  # Votre adresse email pour recevoir les notifications
            
            # Envoyer l'email à l'administrateur
            from django.core.mail import send_mail
            send_mail(
                admin_subject,
                admin_email_content,
                from_email,
                admin_recipients,
                fail_silently=True,
            )
            
            # Envoyer un email de confirmation à l'utilisateur
            user_subject = "Confirmation de votre candidature artisan"
            
            # Contenu de l'email pour l'utilisateur
            user_email_content = f"""
            Bonjour {full_name},
            
            Nous vous remercions d'avoir soumis votre candidature pour devenir artisan sur notre plateforme.
            
            Récapitulatif de votre candidature:
            ---------------------------
            Type d'artisanat: {craft_type_obj.name if craft_type_obj else other_craft + ' (Autre)'}
            Expérience: {experience}
            
            Prochaines étapes:
            ---------------------------
            1. Notre équipe va examiner votre candidature et les photos que vous avez soumises
            2. Nous pourrions vous contacter pour des informations supplémentaires
            3. Vous recevrez une notification par email lorsque votre candidature sera approuvée ou rejetée
            
            Si vous avez des questions, n'hésitez pas à nous contacter.
            
            Cordialement,
            L'équipe Afro Artisanat
            """
            
            # Envoyer l'email à l'utilisateur
            send_mail(
                user_subject,
                user_email_content,
                from_email,
                [email],  # Email de l'utilisateur
                fail_silently=True,
            )
        except Exception as e:
            # Journaliser l'erreur mais continuer le processus
            print(f"Erreur lors de l'envoi de l'email: {e}")

        messages.success(request, 'Votre candidature a été envoyée avec succès!')
        return JsonResponse({'success': True, 'message': 'Votre candidature a été envoyée avec succès! Nous vous contacterons bientôt.'})

    # Pour les requêtes GET, rediriger vers la page artisans
    return redirect('artisans_list')




from django.contrib.auth.decorators import login_required, user_passes_test
from django.shortcuts import redirect, get_object_or_404
from django.contrib import messages
from django.core.mail import send_mail
from django.http import JsonResponse

def is_admin(user):
    return user.is_staff or user.is_superuser

@login_required
@user_passes_test(is_admin)
def update_application_status(request, application_id):
    """
    Vue pour mettre à jour le statut d'une candidature d'artisan et notifier l'utilisateur
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Méthode non autorisée'}, status=405)
    
    application = get_object_or_404(ArtisanApplication, id=application_id)
    new_status = request.POST.get('status')
    
    # Vérifier que le statut est valide
    if new_status not in dict(ArtisanApplication.STATUS_CHOICES):
        return JsonResponse({'success': False, 'message': 'Statut invalide'}, status=400)
    
    # Si le statut n'a pas changé, ne rien faire
    if application.status == new_status:
        return JsonResponse({'success': False, 'message': 'Le statut est déjà défini sur cette valeur'}, status=400)
    
    # Mettre à jour le statut
    old_status = application.status
    application.status = new_status
    application.save()
    
    # Envoyer un email à l'utilisateur pour l'informer du changement de statut
    try:
        subject = f"Mise à jour de votre candidature artisan"
        
        # Préparer le contenu de l'email en fonction du nouveau statut
        if new_status == 'approved':
            email_content = f"""
            Bonjour {application.full_name},
            
            Nous sommes heureux de vous informer que votre candidature pour devenir artisan sur notre plateforme a été APPROUVÉE.
            
            Prochaines étapes:
            ---------------------------
            1. Nous allons créer votre compte artisan et vous envoyer les informations de connexion prochainement
            2. Vous pourrez ensuite compléter votre profil et commencer à ajouter vos créations
            3. Votre profil sera visible par nos clients dès que vous aurez ajouté vos premières créations
            
            Félicitations et bienvenue dans notre communauté d'artisans!
            
            Si vous avez des questions, n'hésitez pas à nous contacter.
            
            Cordialement,
            L'équipe Afro Artisanat
            """
        elif new_status == 'rejected':
            email_content = f"""
            Bonjour {application.full_name},
            
            Nous vous remercions pour l'intérêt que vous portez à notre plateforme.
            
            Après examen attentif de votre candidature, nous sommes au regret de vous informer que nous ne pouvons pas donner suite à votre demande pour devenir artisan sur notre plateforme pour le moment.
            
            Nous vous encourageons à:
            ---------------------------
            - Enrichir votre portfolio avec de nouvelles créations
            - Acquérir plus d'expérience dans votre domaine d'artisanat
            - Soumettre une nouvelle candidature dans quelques mois
            
            Nous restons à votre disposition pour toute question.
            
            Cordialement,
            L'équipe Afro Artisanat
            """
        else:
            email_content = f"""
            Bonjour {application.full_name},
            
            Le statut de votre candidature pour devenir artisan sur notre plateforme a été mis à jour.
            
            Nouveau statut: {dict(ArtisanApplication.STATUS_CHOICES)[new_status]}
            
            Nous vous tiendrons informé de l'évolution de votre candidature.
            
            Cordialement,
            L'équipe Afro Artisanat
            """
        
        # Envoyer l'email
        from_email = 'majokossonou@gmail.com'
        send_mail(
            subject,
            email_content,
            from_email,
            [application.email],
            fail_silently=True,
        )
        
        messages.success(request, f"Le statut de la candidature a été mis à jour et l'utilisateur a été notifié.")
        return JsonResponse({'success': True, 'message': f"Statut mis à jour et notification envoyée à {application.email}"})
    
    except Exception as e:
        # En cas d'erreur d'envoi d'email, on garde la mise à jour du statut mais on informe l'admin
        print(f"Erreur lors de l'envoi de l'email: {e}")
        messages.warning(request, f"Le statut a été mis à jour, mais l'email n'a pas pu être envoyé: {str(e)}")
        return JsonResponse({'success': True, 'warning': f"Statut mis à jour, mais l'email n'a pas pu être envoyé"})

    # Rediriger vers la page de détail de la candidature
    return redirect('admin:artisans_artisanapplication_change', application_id)














# Fonction pour contacter un artisan
def contact_artisan(request, artisan_id):
    artisan = get_object_or_404(Artisan, id=artisan_id, is_active=True)
    
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip()
        subject = request.POST.get('subject', '').strip()
        message = request.POST.get('message', '').strip()
        
        # Validation
        errors = {}
        if not name:
            errors['name'] = 'Ce champ est requis.'
        if not email:
            errors['email'] = 'Ce champ est requis.'
        elif '@' not in email or '.' not in email:
            errors['email'] = 'Adresse email invalide.'
        if not subject:
            errors['subject'] = 'Ce champ est requis.'
        if not message:
            errors['message'] = 'Ce champ est requis.'
            
        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)
            
        # Ici, vous pouvez envoyer un email à l'artisan ou stocker le message en base de données
        # Pour cet exemple, nous allons juste afficher un message de succès
        
        messages.success(request, f'Votre message a été envoyé à {artisan.name}!')
        return JsonResponse({'success': True, 'message': f'Votre message a été envoyé à {artisan.name}!'})
        
    # Pour les requêtes GET, rediriger vers la page de détail de l'artisan
    return redirect('artisan_detail', artisan_id=artisan_id)


# from django.shortcuts import render, redirect, get_object_or_404
# from django.core.paginator import Paginator
# from django.contrib import messages
# from django.db.models import Q
# from .models import Artisan, Region, CraftType, ApplicationPhoto, Testimonial
# from .forms import ArtisanApplicationForm
# from django.http import JsonResponse

# def artisans_list(request):
#     # Get all artisans
#     artisans = Artisan.objects.filter(is_active=True)

#     # Filtering
#     region_filter = request.GET.get('region', 'all')
#     craft_filter = request.GET.get('craft', 'all')
#     search_query = request.GET.get('search', '')

#     if region_filter != 'all':
#         artisans = artisans.filter(region__slug=region_filter)
    
#     if craft_filter != 'all':
#         artisans = artisans.filter(craft_type__slug=craft_filter)
    
#     if search_query:
#         artisans = artisans.filter(
#             Q(name__icontains=search_query) |
#             Q(description__icontains=search_query) |
#             Q(country__icontains=search_query)
#         )

#     # Pagination
#     paginator = Paginator(artisans, 6)  # 6 artisans per page
#     page_number = request.GET.get('page', 1)
#     page_obj = paginator.get_page(page_number)

#     # Get regions and craft types for filters
#     regions = Region.objects.all()
#     craft_types = CraftType.objects.all()

#     # Get testimonials
#     testimonials = Testimonial.objects.filter(is_active=True)
    
#     form = ArtisanApplicationForm()
#     context = {
#         'artisans': page_obj,
#         'regions': regions,
#         'craft_types': craft_types,
#         'testimonials': testimonials,
#         'region_filter': region_filter,
#         'craft_filter': craft_filter,
#         'search_query': search_query,
#         'form': form,  # Add form to context
#     }
#     return render(request, 'website/artisans.html', context)

# def artisan_application(request):
#     if request.method == 'POST':
#         form = ArtisanApplicationForm(request.POST, request.FILES)
#         if form.is_valid():
#             # Sauvegarder l'application
#             application = form.save(commit=False)
#             application.terms_accepted = True
#             application.save()

#             # Gérer les fichiers multiples (limiter à 3 photos)
#             photos = request.FILES.getlist('photos')
#             if len(photos) > 3:
#                 return JsonResponse({'success': False, 'errors': 'Vous ne pouvez télécharger que 3 photos maximum.'}, status=400)

#             for photo in photos:
#                 application_photo = ApplicationPhoto.objects.create(image=photo)
#                 application.photos.add(application_photo)

#             messages.success(request, 'Votre candidature a été envoyée avec succès!')
#             return JsonResponse({'success': True, 'message': 'Candidature envoyée!'})
#         else:
#             errors = form.errors.as_json()
#             return JsonResponse({'success': False, 'errors': errors}, status=400)
#     else:
#         form = ArtisanApplicationForm()

#     return render(request, 'artisans/artisans.html', {'form': form})

# def artisan_detail(request, artisan_id):
#     # Récupérer l'artisan correspondant à l'ID ou renvoyer une erreur 404 si non trouvé
#     artisan = get_object_or_404(Artisan, id=artisan_id, is_active=True)
#     context = {
#         'artisan': artisan,
#     }
#     return render(request, 'artisans/artisan_detail.html', context)