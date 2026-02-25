from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    # Page views
    analyze_resume,
    chatbot_page,
    dashboard_page,
    index_page,
    login_page,
    profile_page,
    recommendations_page,
    register_page,
    resume_page,
    # ViewSets
    UserProfileViewSet,
    ResumeViewSet,
    CareerRecommendationViewSet,
    JobOpportunityViewSet,
    SavedJobViewSet,
    ChatMessageViewSet,
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'resumes', ResumeViewSet, basename='resume')
router.register(r'recommendations', CareerRecommendationViewSet, basename='recommendation')
router.register(r'jobs', JobOpportunityViewSet, basename='job')
router.register(r'saved-jobs', SavedJobViewSet, basename='saved-job')
router.register(r'messages', ChatMessageViewSet, basename='message')

urlpatterns = [
    # Frontend pages
    path("", index_page, name="index"),
    path("resume/", resume_page, name="resume"),
    path("dashboard/", dashboard_page, name="dashboard"),
    path("recommendations/", recommendations_page, name="recommendations"),
    path("chatbot/", chatbot_page, name="chatbot"),
    path("profile/", profile_page, name="profile"),
    path("login/", login_page, name="login"),
    path("register/", register_page, name="register"),
    path("resume", resume_page),
    path("dashboard", dashboard_page),
    path("recommendations", recommendations_page),
    path("chatbot", chatbot_page),
    path("profile", profile_page),
    path("login", login_page),
    path("register", register_page),
    # Legacy endpoint
    path("analyze/", analyze_resume, name="analyze_resume"),
    # Support old/static .html links used in templates
    path("index.html", index_page),
    path("resume.html", resume_page),
    path("dashboard.html", dashboard_page),
    path("recommendations.html", recommendations_page),
    path("chatbot.html", chatbot_page),
    path("profile.html", profile_page),
    path("login.html", login_page),
    path("register.html", register_page),
    # JWT auth endpoints
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # REST API endpoints
    path("api/", include(router.urls)),
]
