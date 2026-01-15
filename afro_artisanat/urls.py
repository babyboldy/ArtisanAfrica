from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# afro_artisanat/urls.py
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Configuration de la vue Swagger pour la documentation API
schema_view = get_schema_view(
    openapi.Info(
        title="Afro Artisanat API",
        default_version='v1',
        description="API pour Afro Artisanat",
        terms_of_service="https://www.example.com/terms/",
        contact=openapi.Contact(email="contact@example.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)
router = DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('store.urls')),
    path('', include('notifications.urls')),
    path('accounts/', include('accounts.urls')),
    path('cart/', include('cart.urls')),
    path('orders/', include('orders.urls')),
    path('payment/', include('payment.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('coupons/', include('coupons.urls')),
    path('blog/', include('blog.urls')),
    path('contact/', include('contact.urls')),
    path('', include('products.urls')),
    path('about/', include('apropos.urls')),
    path('artisans/', include('artisans.urls')),
    
    # path('api/',include([
        
    #     path('', schema_view.with_ui('swagger', cache_timeout=0), name='api-root'),
        
        
    #     path('apropos/', include('apropos.urls')),
    #     path('artisans/', include('artisans.urls',namespace='artisans')),
    #     path('blog/', include('blog.urls')),
    #     path('contact/', include('contact.urls')),
    #     path('notifications/', include('notifications.urls')),
    #     path('orders/', include('orders.urls')),
    #     path('products/', include('products.urls')),
    # ])),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)