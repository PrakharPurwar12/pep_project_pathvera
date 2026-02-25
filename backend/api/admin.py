from django.contrib import admin
from django.utils.html import format_html
from .models import (
    UserProfile,
    Resume,
    CareerRecommendation,
    JobOpportunity,
    SavedJob,
    ChatMessage,
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'location', 'created_at')
    search_fields = ('user__username', 'user__email', 'location')
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'uploaded_at')
    search_fields = ('title', 'user__username')
    list_filter = ('uploaded_at',)
    readonly_fields = ('parsed_content', 'skills', 'experience', 'education', 'uploaded_at', 'updated_at')
    fieldsets = (
        ('Resume Information', {
            'fields': ('user', 'title', 'file')
        }),
        ('Parsed Data', {
            'fields': ('parsed_content', 'skills', 'experience', 'education'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('uploaded_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CareerRecommendation)
class CareerRecommendationAdmin(admin.ModelAdmin):
    list_display = ('career_title', 'user', 'score_display', 'created_at')
    search_fields = ('career_title', 'user__username')
    list_filter = ('created_at', 'match_score')
    readonly_fields = ('created_at', 'updated_at')

    def score_display(self, obj):
        """Color-coded match score display"""
        color = 'green' if obj.match_score >= 0.7 else 'orange' if obj.match_score >= 0.5 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.2f}%</span>',
            color,
            obj.match_score * 100
        )
    score_display.short_description = 'Match Score'


@admin.register(JobOpportunity)
class JobOpportunityAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'location', 'salary_range_display', 'posted_date')
    search_fields = ('title', 'company', 'location')
    list_filter = ('posted_date', 'source')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Job Information', {
            'fields': ('title', 'company', 'location', 'url')
        }),
        ('Details', {
            'fields': ('description', 'source')
        }),
        ('Compensation', {
            'fields': ('salary_min', 'salary_max'),
            'classes': ('collapse',)
        }),
        ('Requirements', {
            'fields': ('requirements',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('posted_date', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def salary_range_display(self, obj):
        if obj.salary_min and obj.salary_max:
            return f"${obj.salary_min:,} - ${obj.salary_max:,}"
        elif obj.salary_min:
            return f"${obj.salary_min:,}+"
        elif obj.salary_max:
            return f"Up to ${obj.salary_max:,}"
        return "Not specified"
    salary_range_display.short_description = 'Salary Range'


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ('user', 'job', 'saved_at')
    search_fields = ('user__username', 'job__title', 'job__company')
    list_filter = ('saved_at',)
    readonly_fields = ('saved_at',)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('user', 'timestamp', 'message_preview')
    search_fields = ('user__username', 'message', 'response')
    list_filter = ('timestamp', 'message_type')
    readonly_fields = ('timestamp',)

    def message_preview(self, obj):
        preview = obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
        return preview
    message_preview.short_description = 'Message'
