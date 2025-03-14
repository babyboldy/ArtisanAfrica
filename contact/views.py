# contact/views.py
from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from .models import Contact, Newsletter

def contact_view(request):
    if request.method == 'POST':
        # Récupérer les données du formulaire
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        phone = request.POST.get('phone')
        subject = request.POST.get('subject')
        message = request.POST.get('message')
        privacy_accepted = request.POST.get('privacy_accepted') == 'on'

        # Validation basique
        if not all([first_name, last_name, email, subject, message, privacy_accepted]):
            messages.error(request, 'Veuillez remplir tous les champs obligatoires.')
            return redirect('contact:contact')

        try:
            # Créer le message de contact
            contact = Contact.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                subject=subject,
                message=message,
                privacy_accepted=privacy_accepted
            )

            # Envoyer un email de confirmation
            subject_email = f"Nouveau message de contact - {contact.subject}"
            message_email = f"""
            Nouveau message de {contact.first_name} {contact.last_name}
            Email: {contact.email}
            Téléphone: {contact.phone}
            Sujet: {contact.get_subject_display()}
            Message: {contact.message}
            """
            
            # Email aux administrateurs
            send_mail(
                subject_email,
                message_email,
                settings.EMAIL_HOST_USER,
                [settings.EMAIL_HOST_USER],
                fail_silently=False,
            )
            
            # Email de confirmation au client
            send_mail(
                "Confirmation de votre message",
                "Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.",
                settings.EMAIL_HOST_USER,
                [contact.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Votre message a été envoyé avec succès!')
            return redirect('contact')

        except Exception as e:
            messages.error(request, 'Une erreur est survenue. Veuillez réessayer.')
            return redirect('contact')

    # Pour GET request
    context = {
        'subject_choices': Contact.SUBJECT_CHOICES
    }
    return render(request, 'website/contact.html', context)





def newsletter_subscribe(request):
    if request.method == "POST":
        email = request.POST.get('email')
        try:
            # Créer ou récupérer l'entrée newsletter
            newsletter, created = Newsletter.objects.get_or_create(email=email)
            
            # Envoyer un email de confirmation seulement si c'est une nouvelle inscription
            if created:
                # Email de confirmation au client
                subject = "Confirmation d'inscription à la newsletter"
                message = f"""
                Bonjour,
                
                Merci de vous être inscrit à notre newsletter!
                
                Vous recevrez désormais nos actualités, offres spéciales et promotions exclusives.
                
                Si vous souhaitez vous désinscrire, cliquez sur le lien de désinscription présent dans nos emails.
                
                L'équipe
                """
                
                send_mail(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    [email],
                    fail_silently=False,
                )
                
                messages.success(request, "Inscription à la newsletter réussie! Un email de confirmation vous a été envoyé.")
            else:
                messages.info(request, "Vous êtes déjà inscrit à notre newsletter!")
        except Exception as e:
            messages.error(request, f"Une erreur est survenue lors de l'inscription: {str(e)}")
        
        # Rediriger vers la page précédente ou la page d'accueil
        return redirect(request.META.get('HTTP_REFERER', 'home'))
    return redirect('home')



