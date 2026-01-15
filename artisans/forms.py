# artisans/forms.py
from django import forms
from .models import ArtisanApplication, CraftType




class ArtisanApplicationForm(forms.ModelForm):
    photos = forms.FileField(
        # widget=forms.FileInput(attrs={'multiple': 'multiple'}),  # Use 'multiple' as string key
        # required=True,
        widget=forms.ClearableFileInput(),  # Pas de multiple=True ici    
        required=False,
    help_text="Formats acceptés: JPG, PNG. Taille max: 5MB par image."
    )

    class Meta:
        model = ArtisanApplication
        fields = [
            'full_name', 'email', 'phone', 'country', 'craft_type',
            'other_craft', 'experience', 'description', 'portfolio_url',
            'terms_accepted'
        ]
    widgets = {
                'description': forms.Textarea(attrs={'rows': 4}),
                'terms_accepted': forms.CheckboxInput(),
                'country': forms.Select(choices=[
                    ('', 'Sélectionnez votre pays'),
                    ('Algeria', 'Algérie'),
                    ('Angola', 'Angola'),
                    ('Benin', 'Bénin'),
                    ('Botswana', 'Botswana'),
                    ('Burkina Faso', 'Burkina Faso'),
                    ('Burundi', 'Burundi'),
                    ('Cameroon', 'Cameroun'),
                    ('Cape Verde', 'Cap-Vert'),
                    ('Central African Republic', 'République centrafricaine'),
                    ('Chad', 'Tchad'),
                    ('Comoros', 'Comores'),
                    ("Côte d'Ivoire", "Côte d'Ivoire"),
                    ('DR Congo', 'République démocratique du Congo'),
                    ('Djibouti', 'Djibouti'),
                    ('Egypt', 'Égypte'),
                    ('Equatorial Guinea', 'Guinée équatoriale'),
                    ('Eritrea', 'Érythrée'),
                    ('Eswatini', 'Eswatini'),
                    ('Ethiopia', 'Éthiopie'),
                    ('Gabon', 'Gabon'),
                    ('Gambia', 'Gambie'),
                    ('Ghana', 'Ghana'),
                    ('Guinea', 'Guinée'),
                    ('Guinea-Bissau', 'Guinée-Bissau'),
                    ('Kenya', 'Kenya'),
                    ('Lesotho', 'Lesotho'),
                    ('Liberia', 'Liberia'),
                    ('Libya', 'Libye'),
                    ('Madagascar', 'Madagascar'),
                    ('Malawi', 'Malawi'),
                    ('Mali', 'Mali'),
                    ('Mauritania', 'Mauritanie'),
                    ('Mauritius', 'Maurice'),
                    ('Morocco', 'Maroc'),
                    ('Mozambique', 'Mozambique'),
                    ('Namibia', 'Namibie'),
                    ('Niger', 'Niger'),
                    ('Nigeria', 'Nigeria'),
                    ('Rwanda', 'Rwanda'),
                    ('São Tomé and Príncipe', 'Sao Tomé-et-Principe'),
                    ('Senegal', 'Sénégal'),
                    ('Seychelles', 'Seychelles'),
                    ('Sierra Leone', 'Sierra Leone'),
                    ('Somalia', 'Somalie'),
                    ('South Africa', 'Afrique du Sud'),
                    ('South Sudan', 'Soudan du Sud'),
                    ('Sudan', 'Soudan'),
                    ('Tanzania', 'Tanzanie'),
                    ('Togo', 'Togo'),
                    ('Tunisia', 'Tunisie'),
                    ('Uganda', 'Ouganda'),
                    ('Zambia', 'Zambie'),
                    ('Zimbabwe', 'Zimbabwe'),
                ]),
                'craft_type': forms.Select(choices=[
                    ('', 'Sélectionnez votre spécialité'),
                    ('Textile', 'Textile (tissage, teinture, broderie)'),
                    ('Poterie', 'Poterie et céramique'),
                    ('Bijouterie', 'Bijouterie et joaillerie'),
                    ('Sculpture', 'Sculpture (bois, pierre, métal)'),
                    ('Vannerie', 'Vannerie et tissage'),
                    ('Cuir', 'Travail du cuir'),
                    ('Peinture', 'Peinture et dessin'),
                    ('Autre', 'Autre (précisez)'),
                ]),
                'experience': forms.Select(choices=[
                    ('', 'Sélectionnez'),
                    ('0-2', '0-2 ans'),
                    ('3-5', '3-5 ans'),
                    ('6-10', '6-10 ans'),
                    ('11-20', '11-20 ans'),
                    ('20+', 'Plus de 20 ans'),
                ]),
            }

    def clean_photos(self):
        photos = self.files.getlist('photos')
        max_photos = 3
        max_size = 5 * 1024 * 1024  # 5MB

        if len(photos) > max_photos:
            raise forms.ValidationError(f"Vous ne pouvez uploader que {max_photos} photos maximum.")
        
        for photo in photos:
            if photo.size > max_size:
                raise forms.ValidationError(f"La taille de l'image {photo.name} dépasse 5MB.")
            if not photo.content_type.startswith('image'):
                raise forms.ValidationError(f"Le fichier {photo.name} n'est pas une image valide.")
        
        return photos