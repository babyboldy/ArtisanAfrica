from django.contrib import admin
from .models import TeamMember, CompanyValue, Testimonial, AboutContent, ProcessStep

@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'position', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'position')
    list_editable = ('order', 'is_active')

@admin.register(CompanyValue)
class CompanyValueAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title', 'description')
    list_editable = ('order', 'is_active')

@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'title', 'location', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'title', 'content')
    list_editable = ('is_active',)

@admin.register(AboutContent)
class AboutContentAdmin(admin.ModelAdmin):
    list_display = ('title', 'subtitle')
    fieldsets = (
        ('En-tête', {
            'fields': ('title', 'subtitle')
        }),
        ('Histoire', {
            'fields': ('history_title', 'history_content')
        }),
        ('Mission', {
            'fields': ('mission_title', 'mission_content')
        }),
        ('Équipe', {
            'fields': ('team_title', 'team_intro')
        }),
        ('Processus', {
            'fields': ('process_title',)
        }),
        ('Appel à l\'action', {
            'fields': ('cta_title', 'cta_content')
        }),
    )

@admin.register(ProcessStep)
class ProcessStepAdmin(admin.ModelAdmin):
    list_display = ('title', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title', 'description')
    list_editable = ('order', 'is_active')