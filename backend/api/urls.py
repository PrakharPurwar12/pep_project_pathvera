from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    # Page views
    analyze_resume,
    chat_api,
    chatbot_page,
    dashboard_page,
    index_page,
    login_page,
    profile_page,
    recommendations_page,
    register_page,
    resume_page,
    auth_register_api,
    auth_login_api,
    auth_logout_api,
    auth_session_api,
    profile_summary_api,
    # ViewSets
    UserProfileViewSet,
    ResumeViewSet,
    CareerRecommendationViewSet,
    JobOpportunityViewSet,
    SavedJobViewSet,
    ChatMessageViewSet,
    ProtectedView,
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
    # Session auth endpoints for frontend
    path("api/auth/register/", auth_register_api, name="auth_register_api"),
    path("api/auth/login/", auth_login_api, name="auth_login_api"),
    path("api/auth/logout/", auth_logout_api, name="auth_logout_api"),
    path("api/auth/session/", auth_session_api, name="auth_session_api"),
    path("api/profile/summary/", profile_summary_api, name="profile_summary_api"),
    # Legacy endpoint
    path("analyze/", analyze_resume, name="analyze_resume"),
    path("api/chat/", chat_api, name="chat_api"),
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
    path("api/protected/", ProtectedView.as_view(), name="protected_api"),
    # REST API endpoints
    path("api/", include(router.urls)),
]
