# blog/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView
from .models import BlogPost, BlogCategory, Tag, Comment
from .forms import CommentForm
# blog/views.py
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.urls import reverse_lazy, reverse
from django.contrib import messages
from django.utils import timezone
from django.http import JsonResponse
from django.db.models import Q
from .models import BlogPost, BlogCategory, Tag, Comment
from .forms import CommentForm, BlogPostForm

class PostListView(ListView):
    model = BlogPost
    template_name = 'website/post_list.html'
    paginate_by = 6

    def get_queryset(self):
        return BlogPost.objects.filter(status='published').order_by('-published_at')

def post_detail(request, slug):
    post = get_object_or_404(BlogPost, slug=slug, status='published')
    comments = post.comments.filter(is_approved=True)
    comment_form = CommentForm()

    if request.method == 'POST':
        if request.user.is_authenticated:
            comment_form = CommentForm(request.POST)
            if comment_form.is_valid():
                comment = comment_form.save(commit=False)
                comment.post = post
                comment.author = request.user
                comment.save()
                return redirect('blog:post_detail', slug=post.slug)
        else:
            return redirect('login')

    post.view_count += 1
    post.save()

    context = {
        'post': post,
        'comments': comments,
        'comment_form': comment_form,
        'categories': BlogCategory.objects.filter(is_active=True),
        'tags': Tag.objects.all(),
    }
    return render(request, 'website/post_detail.html', context)






from .models import BlogPost, BlogCategory, Tag, Comment
from .forms import CommentForm, BlogPostForm

# Ajoutez ces vues à votre fichier views.py existant

@login_required
def user_blog_posts(request):
    """Vue pour afficher les articles de blog de l'utilisateur."""
    posts = BlogPost.objects.filter(author=request.user).order_by('-created_at')
    
    context = {
        'posts': posts,
        'categories': BlogCategory.objects.filter(is_active=True),
        'tags': Tag.objects.all(),
    }
    return render(request, 'website/article.html', context)

@login_required
def create_blog_post(request):
    """Vue pour créer un nouvel article de blog."""
    if request.method == 'POST':
        form = BlogPostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.status = 'draft'  # Statut par défaut: brouillon
            post.save()
            
            # Sauvegarder les tags (m2m)
            form.save_m2m()
            
            messages.success(request, 'Votre article a été créé avec succès et est en attente de validation par l\'administrateur.')
            return redirect('user_blog_posts')
    else:
        form = BlogPostForm()
    
    context = {
        'form': form,
        'categories': BlogCategory.objects.filter(is_active=True),
        'tags': Tag.objects.all(),
    }
    return render(request, 'website/create_article.html', context)

@login_required
def edit_blog_post(request, post_id):
    """Vue pour modifier un article de blog existant."""
    post = get_object_or_404(BlogPost, id=post_id, author=request.user)
    
    # Vérifier si l'article est déjà publié
    if post.status == 'published':
        messages.warning(request, 'Vous ne pouvez pas modifier un article déjà publié.')
        return redirect('client_profile')
    
    if request.method == 'POST':
        form = BlogPostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            post = form.save(commit=False)
            post.updated_at = timezone.now()
            post.save()
            
            # Sauvegarder les tags (m2m)
            form.save_m2m()
            
            messages.success(request, 'Votre article a été mis à jour avec succès.')
            return redirect('user_blog_posts')
    else:
        form = BlogPostForm(instance=post)
    
    context = {
        'form': form,
        'post': post,
        'categories': BlogCategory.objects.filter(is_active=True),
        'tags': Tag.objects.all(),
    }
    return render(request, 'website/update_article.html', context)

@login_required
def delete_blog_post(request, post_id):
    """Vue pour supprimer un article de blog."""
    post = get_object_or_404(BlogPost, id=post_id, author=request.user)
    
    # Vérifier si l'article est déjà publié
    if post.status == 'published':
        messages.warning(request, 'Vous ne pouvez pas supprimer un article déjà publié.')
        return redirect('client_profile')
    
    if request.method == 'POST':
        post.delete()
        messages.success(request, 'Votre article a été supprimé avec succès.')
        return redirect('client_profile')
    
    context = {
        'post': post,
    }
    return render(request, 'website/delete_article.html', context)

@login_required
def blog_post_preview(request, post_id):
    """Vue pour prévisualiser un article avant soumission."""
    post = get_object_or_404(BlogPost, id=post_id, author=request.user)
    
    context = {
        'post': post,
        'is_preview': True,
    }
    return render(request, 'website/previsualisation.html', context)