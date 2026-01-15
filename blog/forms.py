# blog/forms.py
from django import forms
from .models import BlogPost, Comment
from django.utils.translation import gettext_lazy as _

class BlogPostForm(forms.ModelForm):
    class Meta:
        model = BlogPost
        fields = ['title', 'category', 'content', 'excerpt', 'featured_image', 'tags']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Titre de l\'article'}),
            'category': forms.Select(attrs={'class': 'form-control'}),
            'content': forms.Textarea(attrs={'class': 'form-control', 'rows': 10, 'placeholder': 'Contenu de l\'article'}),
            'excerpt': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Court résumé de l\'article'}),
            'tags': forms.SelectMultiple(attrs={'class': 'form-control'}),
        }
        labels = {
            'title': _('Titre'),
            'category': _('Catégorie'),
            'content': _('Contenu'),
            'excerpt': _('Extrait'),
            'featured_image': _('Image principale'),
            'tags': _('Tags'),
        }
        help_texts = {
            'excerpt': _('Un court résumé qui sera affiché dans les listes d\'articles'),
            'featured_image': _('Image principale de l\'article (dimension recommandée: 1200x630px)'),
            'tags': _('Sélectionnez un ou plusieurs tags pour votre article'),
        }


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['content']
        widgets = {
            'content': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Écrivez votre commentaire...',
                'rows': 4,
            }),
        }
        
        
    