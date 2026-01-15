# models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.utils.text import slugify

class BlogCategory(models.Model):
    name = models.CharField(_('Nom'), max_length=100)
    slug = models.SlugField(_('Slug'), unique=True)
    description = models.TextField(_('Description'), blank=True)
    image = models.ImageField(_('Image'), upload_to='blog/categories/', blank=True, null=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_('Catégorie parente')
    )
    order = models.IntegerField(_('Ordre d\'affichage'), default=0)
    is_active = models.BooleanField(_('Actif'), default=True)

    class Meta:
        verbose_name = _('Catégorie de blog')
        verbose_name_plural = _('Catégories de blog')
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class Tag(models.Model):
    name = models.CharField(_('Nom'), max_length=50)
    slug = models.SlugField(_('Slug'), unique=True)

    class Meta:
        verbose_name = _('Tag')
        verbose_name_plural = _('Tags')
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class BlogPost(models.Model):
    STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('published', _('Publié')),
        ('archived', _('Archivé'))
    ]

    title = models.CharField(_('Titre'), max_length=200)
    slug = models.SlugField(_('Slug'), unique=True)
    category = models.ForeignKey(
        BlogCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='posts',
        verbose_name=_('Catégorie')
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='blog_posts',
        verbose_name=_('Auteur')
    )
    content = models.TextField(_('Contenu'))
    excerpt = models.TextField(_('Extrait'), blank=True)
    featured_image = models.ImageField(_('Image à la une'), upload_to='blog/posts/')
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts', verbose_name=_('Tags'))
    
    # SEO fields
    meta_title = models.CharField(_('Titre SEO'), max_length=60, blank=True)
    meta_description = models.CharField(_('Description SEO'), max_length=160, blank=True)
    
    # Status and dates
    status = models.CharField(_('Statut'), max_length=20, choices=STATUS_CHOICES, default='draft')
    is_featured = models.BooleanField(_('Mis en avant'), default=False)
    created_at = models.DateTimeField(_('Date de création'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Date de modification'), auto_now=True)
    published_at = models.DateTimeField(_('Date de publication'), null=True, blank=True)

    # Statistics
    view_count = models.PositiveIntegerField(_('Nombre de vues'), default=0)
    like_count = models.PositiveIntegerField(_('Nombre de likes'), default=0)
    share_count = models.PositiveIntegerField(_('Nombre de partages'), default=0)

    class Meta:
        verbose_name = _('Article')
        verbose_name_plural = _('Articles')
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        if not self.meta_title:
            self.meta_title = self.title[:60]
        if not self.meta_description and self.excerpt:
            self.meta_description = self.excerpt[:160]
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('blog:post_detail', kwargs={'slug': self.slug})

class Comment(models.Model):
    post = models.ForeignKey(
        BlogPost,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name=_('Article')
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='blog_comments',
        verbose_name=_('Auteur')
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name=_('Commentaire parent')
    )
    content = models.TextField(_('Contenu'))
    is_approved = models.BooleanField(_('Approuvé'), default=True)
    created_at = models.DateTimeField(_('Date de création'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Date de modification'), auto_now=True)

    class Meta:
        verbose_name = _('Commentaire')
        verbose_name_plural = _('Commentaires')
        ordering = ['-created_at']

    def __str__(self):
        return f'Commentaire de {self.author} sur {self.post}'