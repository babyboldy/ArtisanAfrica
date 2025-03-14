from django.contrib import admin
from .models import Category, Product, ProductMedia

class ProductMediaInline(admin.TabularInline):
    model = ProductMedia
    extra = 1  # Permet d'ajouter plusieurs images et vidéos en même temps

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'color', 'featured', 'image_preview')
    search_fields = ('name',)
    list_filter = ('featured',)
    ordering = ('name',)
    prepopulated_fields = {"name": ("name",)}

    def image_preview(self, obj):
        if obj.image:
            return f'<img src="{obj.image.url}" width="50" height="50" style="border-radius:5px;" />'
        return "Aucune image"
    
    image_preview.allow_tags = True
    image_preview.short_description = "Aperçu"

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'stock', 'status', 'featured')
    search_fields = ('name', 'sku', 'barcode')
    list_filter = ('category', 'status', 'featured')
    ordering = ('name',)
    fieldsets = (
        ("Informations générales", {
            'fields': ('name', 'category', 'description')
        }),
        ("Détails du produit", {
            'fields': ('price', 'stock', 'sku', 'barcode', 'weight')
        }),
        ("Options avancées", {
            'fields': ('status', 'featured')
        }),
    )
    inlines = [ProductMediaInline]  # Permet d'ajouter des images et vidéos directement dans l'admin

@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
    list_display = ('product', 'media_type', 'file')
    list_filter = ('media_type',)
