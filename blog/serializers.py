# blog/serializers.py
from rest_framework import serializers
from .models import BlogCategory, Tag, BlogPost, Comment
from django.contrib.auth import get_user_model

User = get_user_model()

class BlogCategorySerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=BlogCategory.objects.all(), allow_null=True, required=False
    )
    children = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug', 'description', 'image', 'parent', 'children', 'order', 'is_active']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']

class BlogPostSerializer(serializers.ModelSerializer):
    category = BlogCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=BlogCategory.objects.all(), source='category', write_only=True, allow_null=True
    )
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='author', write_only=True, allow_null=True
    )
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), source='tags', many=True, write_only=True, required=False
    )

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'category', 'category_id', 'author', 'author_id', 'content',
            'excerpt', 'featured_image', 'tags', 'tag_ids', 'meta_title', 'meta_description',
            'status', 'is_featured', 'created_at', 'updated_at', 'published_at', 'view_count',
            'like_count', 'share_count'
        ]

class CommentSerializer(serializers.ModelSerializer):
    post = serializers.StringRelatedField(read_only=True)
    post_id = serializers.PrimaryKeyRelatedField(
        queryset=BlogPost.objects.all(), source='post', write_only=True
    )
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='author', write_only=True, allow_null=True
    )
    parent = serializers.PrimaryKeyRelatedField(
        queryset='self', allow_null=True, required=False
    )
    replies = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'post_id', 'author', 'author_id', 'parent', 'replies',
            'content', 'is_approved', 'created_at', 'updated_at'
        ]