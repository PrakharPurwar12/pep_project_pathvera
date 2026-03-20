from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html

from .models import (
    CareerRecommendation,
    ChatMessage,
    JobOpportunity,
    Resume,
    ResumeAnalysis,
    SavedJob,
    UserActivity,
    UserProfile,
)


admin.site.site_header = "PathVera Admin"
admin.site.site_title = "PathVera Admin"
admin.site.index_title = "Career Intelligence Control Panel"


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    fk_name = "user"
    readonly_fields = ("created_at", "updated_at")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone_number", "location", "created_at")
    search_fields = ("user__username", "user__email", "phone_number", "location")
    list_filter = ("created_at", "updated_at")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "uploaded_at", "updated_at")
    list_filter = ("uploaded_at", "updated_at")
    search_fields = ("title", "user__username", "user__email")
    readonly_fields = ("uploaded_at", "updated_at")
    autocomplete_fields = ("user",)
    fieldsets = (
        ("Resume Information", {"fields": ("user", "title", "file")}),
        (
            "Parsed Data",
            {
                "fields": ("parsed_content", "skills", "experience", "education"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("uploaded_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(CareerRecommendation)
class CareerRecommendationAdmin(admin.ModelAdmin):
    list_display = (
        "career_title",
        "user",
        "resume",
        "score_display",
        "created_at",
    )
    list_filter = ("created_at", "updated_at")
    search_fields = ("career_title", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ("user", "resume")

    @admin.display(description="Match Score")
    def score_display(self, obj):
        score = float(obj.match_score or 0)
        if score <= 1:
            score *= 100
        color = "#14804a" if score >= 70 else "#b76e00" if score >= 50 else "#b42318"
        return format_html('<strong style="color:{};">{:.2f}%</strong>', color, score)


@admin.register(JobOpportunity)
class JobOpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "company",
        "location",
        "salary_range_display",
        "posted_date",
        "source",
    )
    list_filter = ("source", "posted_date", "created_at")
    search_fields = ("title", "company", "location")
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Job Information", {"fields": ("title", "company", "location", "url")}),
        ("Details", {"fields": ("description", "source")}),
        (
            "Compensation",
            {"fields": ("salary_min", "salary_max"), "classes": ("collapse",)},
        ),
        ("Requirements", {"fields": ("requirements",), "classes": ("collapse",)}),
        (
            "Dates",
            {"fields": ("posted_date", "created_at"), "classes": ("collapse",)},
        ),
    )

    @admin.display(description="Salary Range")
    def salary_range_display(self, obj):
        if obj.salary_min and obj.salary_max:
            return f"${obj.salary_min:,} - ${obj.salary_max:,}"
        if obj.salary_min:
            return f"${obj.salary_min:,}+"
        if obj.salary_max:
            return f"Up to ${obj.salary_max:,}"
        return "Not specified"


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ("user", "job", "saved_at")
    list_filter = ("saved_at",)
    search_fields = ("user__username", "user__email", "job__title", "job__company")
    readonly_fields = ("saved_at",)
    autocomplete_fields = ("user", "job")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("user", "message_type", "timestamp", "message_preview")
    list_filter = ("message_type", "timestamp")
    search_fields = ("user__username", "user__email", "message", "response")
    readonly_fields = ("timestamp",)
    autocomplete_fields = ("user",)

    @admin.display(description="Message")
    def message_preview(self, obj):
        text = (obj.message or "").strip()
        return f"{text[:80]}..." if len(text) > 80 else text


@admin.register(ResumeAnalysis)
class ResumeAnalysisAdmin(admin.ModelAdmin):
    list_display = ("user", "resume_score", "skill_count", "career_count", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "user__email")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("user",)

    @admin.display(description="Skills")
    def skill_count(self, obj):
        return len(obj.skills or [])

    @admin.display(description="Career Matches")
    def career_count(self, obj):
        return len(obj.career_matches or [])


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "user__email", "action")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("user",)


class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = BaseUserAdmin.list_display + ("is_staff", "is_superuser")
    search_fields = ("username", "email", "first_name", "last_name")


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
