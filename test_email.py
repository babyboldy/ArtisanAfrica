"""
Script de test pour vérifier la configuration SMTP
Exécutez ce script avec: python manage.py shell < test_email.py
Ou depuis le shell Django: exec(open('test_email.py').read())
"""

from django.core.mail import send_mail
from django.conf import settings

def test_email():
    """Test l'envoi d'un email"""
    try:
        print("Test d'envoi d'email...")
        print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        print("-" * 50)
        
        # Envoyer un email de test
        send_mail(
            subject='Test Email - Configuration SMTP',
            message='Ceci est un email de test pour vérifier que la configuration SMTP fonctionne correctement.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.EMAIL_HOST_USER],  # Envoyer à vous-même
            fail_silently=False,
        )
        
        print("✅ Email envoyé avec succès!")
        print(f"Vérifiez votre boîte de réception: {settings.EMAIL_HOST_USER}")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi de l'email: {e}")
        print("\nVérifications à faire:")
        print("1. Vérifiez que le mot de passe d'application Gmail est correct")
        print("2. Assurez-vous que l'authentification à deux facteurs est activée sur votre compte Gmail")
        print("3. Vérifiez que vous avez créé un 'Mot de passe d'application' dans les paramètres Google")
        print("4. Vérifiez votre connexion Internet")
        print("\nPour créer un mot de passe d'application Gmail:")
        print("- Allez sur https://myaccount.google.com/apppasswords")
        print("- Sélectionnez 'Mail' et 'Autre (nom personnalisé)'")
        print("- Entrez un nom (ex: Django App)")
        print("- Copiez le mot de passe généré et utilisez-le dans EMAIL_HOST_PASSWORD")

if __name__ == '__main__':
    import os
    import django
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'afro_artisanat.settings')
    django.setup()
    test_email()
