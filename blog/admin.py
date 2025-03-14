# admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import BlogCategory, Tag, BlogPost, Comment

@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'order', 'is_active', 'post_count']
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['order', 'name']

    def post_count(self, obj):
        return obj.posts.count()
    post_count.short_description = _('Nombre d\'articles')

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'post_count']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}

    def post_count(self, obj):
        return obj.posts.count()
    post_count.short_description = _('Nombre d\'articles')

@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'category',
        'author',
        'status',
        'is_featured',
        'published_at',
        'view_count'
    ]
    list_filter = ['status', 'is_featured', 'category', 'author']
    search_fields = ['title', 'content', 'excerpt']
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ['tags']
    date_hierarchy = 'published_at'
    
    fieldsets = (
        (_('Contenu principal'), {
            'fields': ('title', 'slug', 'content', 'excerpt', 'featured_image')
        }),
        (_('Catégorisation'), {
            'fields': ('category', 'tags')
        }),
        (_('Publication'), {
            'fields': ('status', 'is_featured', 'author', 'published_at')
        }),
        (_('SEO'), {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
        (_('Statistiques'), {
            'fields': ('view_count', 'like_count', 'share_count'),
            'classes': ('collapse',)
        })
    )

    def save_model(self, request, obj, form, change):
        if not obj.author:
            obj.author = request.user
        super().save_model(request, obj, form, change)

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['post', 'author', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'created_at']
    search_fields = ['content', 'author__email', 'post__title']
    raw_id_fields = ['post', 'author', 'parent']
    actions = ['approve_comments', 'disapprove_comments']

    def approve_comments(self, request, queryset):
        queryset.update(is_approved=True)
    approve_comments.short_description = _("Approuver les commentaires sélectionnés")

    def disapprove_comments(self, request, queryset):
        queryset.update(is_approved=False)
    disapprove_comments.short_description = _("Désapprouver les commentaires sélectionnés")