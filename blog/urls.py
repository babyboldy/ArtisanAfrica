from django.urls import include, path
from . import views

from rest_framework.routers import DefaultRouter
from .viewsets import BlogCategoryViewSet, TagViewSet, BlogPostViewSet, CommentViewSet

router = DefaultRouter()
router.register(r'categories', BlogCategoryViewSet, basename='categories')
router.register(r'tags', TagViewSet, basename='tags')
router.register(r'posts', BlogPostViewSet, basename='posts')
router.register(r'comments', CommentViewSet, basename='comments')

app_name = 'blog'
urlpatterns = [ 
    path('', views.PostListView.as_view(), name='post_list'),
    path('post/<slug:slug>/', views.post_detail, name='post_detail'),
    path('', include(router.urls)),
        # Nouvelles URLs pour la gestion des articles par l'utilisateur
    path('user/posts/', views.user_blog_posts, name='user_posts'),
    path('user/post/create/', views.create_blog_post, name='create_post'),
    
    path('user/post/<int:post_id>/edit/', views.edit_blog_post, name='edit_post'),
    path('user/post/<int:post_id>/delete/', views.delete_blog_post, name='delete_post'),
    path('user/post/<int:post_id>/preview/', views.blog_post_preview, name='post_preview'),
]