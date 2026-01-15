# blog/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import BlogCategory, Tag, BlogPost, Comment
from .serializers import BlogCategorySerializer, TagSerializer, BlogPostSerializer, CommentSerializer

class BlogCategoryViewSet(viewsets.ModelViewSet):
    queryset = BlogCategory.objects.filter(is_active=True)
    serializer_class = BlogCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all()
    serializer_class = BlogPostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Ne montrer que les articles publiés aux utilisateurs non authentifiés
        if not self.request.user.is_authenticated:
            return BlogPost.objects.filter(status='published')
        return BlogPost.objects.all()

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.filter(is_approved=True)
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Permettre aux utilisateurs authentifiés de voir tous les commentaires
        if self.request.user.is_authenticated:
            return Comment.objects.all()
        return Comment.objects.filter(is_approved=True)
    
    from rest_framework.permissions import IsAdminUser


from rest_framework.permissions import IsAdminUser
class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all()
    serializer_class = BlogPostSerializer
    permission_classes = [IsAdminUser]  # Réservé aux admins