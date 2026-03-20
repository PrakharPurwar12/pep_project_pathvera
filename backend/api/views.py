import os
import json
import logging
import tempfile
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.shortcuts import render
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from ml.pipeline.resume_parser import parse_resume
from ml.pipeline.recommendation_engine import recommend_careers
try:
    from google import genai
except ImportError:
    genai = None

from .models import (
    UserProfile,
    Resume,
    CareerRecommendation,
    JobOpportunity,
    SavedJob,
    ChatMessage,
    ResumeAnalysis,
    UserActivity,
)
from .serializers import (
    UserProfileSerializer,
    ResumeSerializer,
    CareerRecommendationSerializer,
    JobOpportunitySerializer,
    SavedJobSerializer,
    ChatMessageSerializer,
)

logger = logging.getLogger(__name__)


class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "Authenticated user access granted"})


#Frontend Pages

@ensure_csrf_cookie
def index_page(request):
    return render(request, "index.html")

@ensure_csrf_cookie
def resume_page(request):
    return render(request, "resume.html")

@ensure_csrf_cookie
def dashboard_page(request):
    return render(request, "dashboard.html")

@ensure_csrf_cookie
def recommendations_page(request):
    return render(request, "recommendations.html")

@ensure_csrf_cookie
def chatbot_page(request):
    return render(request, "chatbot.html")

@ensure_csrf_cookie
def profile_page(request):
    profile = None
    resume = None
    activities = []

    if getattr(request, "user", None) and request.user.is_authenticated:
        profile = UserProfile.objects.filter(user=request.user).first()
        resume = ResumeAnalysis.objects.filter(user=request.user).order_by("-created_at").first()
        activities = list(UserActivity.objects.filter(user=request.user).order_by("-created_at")[:8])

    skills = _normalize_context_list(resume.skills if resume else [])
    career_matches = _normalize_context_list(resume.career_matches if resume else [])
    skill_gaps = _normalize_context_list(resume.skill_gaps if resume else [])
    resume_score = max(0, min(100, int(resume.resume_score if resume else 0)))
    ai_summary = generate_ai_career_summary(skills, career_matches)
    no_analysis_message = "No resume analysis available. Upload a resume to see insights."

    context = {
        "profile_user": request.user,
        "profile_details": profile,
        "skills": skills,
        "career_matches": career_matches,
        "skill_gaps": skill_gaps,
        "resume_score": resume_score,
        "ai_summary": ai_summary,
        "has_resume_analysis": bool(resume),
        "no_analysis_message": no_analysis_message,
        "latest_analysis_at": resume.created_at if resume else None,
        "activities": activities,
    }
    return render(request, "profile.html", context)


def _split_full_name(full_name):
    parts = str(full_name or "").strip().split()
    if not parts:
        return "", ""
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    return first_name, last_name


def _serialize_auth_user(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.get_full_name().strip() or user.username,
        "email": user.email or "",
        "location": profile.location or "",
        "bio": profile.bio or "",
        "is_staff": bool(user.is_staff),
    }


@csrf_exempt
@require_http_methods(["POST"])
def auth_register_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    full_name = str(payload.get("full_name", "")).strip()
    username = str(payload.get("username", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not full_name or not username or not email or not password:
        return JsonResponse({"error": "All fields are required."}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"error": "Username already taken."}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "Email already registered."}, status=400)

    temp_user = User(username=username, email=email)
    first_name, last_name = _split_full_name(full_name)
    temp_user.first_name = first_name
    temp_user.last_name = last_name

    try:
        validate_password(password, user=temp_user)
    except ValidationError as validation_error:
        message = validation_error.messages[0] if validation_error.messages else "Password is not valid."
        return JsonResponse({"error": message}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    UserProfile.objects.get_or_create(user=user)
    return JsonResponse({"message": "Registration successful."}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def auth_login_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    identifier = str(payload.get("login_id", "")).strip()
    password = str(payload.get("password", ""))

    if not identifier or not password:
        return JsonResponse({"error": "Email/username and password are required."}, status=400)

    candidate = User.objects.filter(email__iexact=identifier).first()
    username = candidate.username if candidate else identifier
    user = authenticate(request, username=username, password=password)

    if user is None:
        return JsonResponse({"error": "Invalid credentials."}, status=401)

    django_login(request, user)
    UserProfile.objects.get_or_create(user=user)
    return JsonResponse({"user": _serialize_auth_user(user)})


@csrf_exempt
@require_http_methods(["POST"])
def auth_logout_api(request):
    django_logout(request)
    return JsonResponse({"message": "Logged out successfully."})


@require_http_methods(["GET"])
def auth_session_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated."}, status=401)
    return JsonResponse({"user": _serialize_auth_user(request.user)})


@require_http_methods(["GET"])
def profile_summary_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated."}, status=401)

    profile = UserProfile.objects.filter(user=request.user).first()
    resume = ResumeAnalysis.objects.filter(user=request.user).order_by("-created_at").first()
    activities = list(UserActivity.objects.filter(user=request.user).order_by("-created_at")[:8])

    skills = _normalize_context_list(resume.skills if resume else [])
    career_matches = _normalize_context_list(resume.career_matches if resume else [])
    skill_gaps = _normalize_context_list(resume.skill_gaps if resume else [])
    resume_score = max(0, min(100, int(resume.resume_score if resume else 0)))
    ai_summary = generate_ai_career_summary(skills, career_matches)

    return JsonResponse({
        "user": _serialize_auth_user(request.user),
        "location": profile.location if profile else "",
        "phone_number": profile.phone_number if profile and profile.phone_number else "",
        "bio": profile.bio if profile and profile.bio else "",
        "skills": skills,
        "career_matches": career_matches,
        "skill_gaps": skill_gaps,
        "resume_score": resume_score,
        "ai_summary": ai_summary,
        "latest_analysis_at": resume.created_at.isoformat() if resume else None,
        "activities": [
            {
                "action": activity.action,
                "created_at": activity.created_at.isoformat(),
            }
            for activity in activities
        ],
    })

@ensure_csrf_cookie
def login_page(request):
    return render(request, "login.html")

@ensure_csrf_cookie
def register_page(request):
    return render(request, "register.html")


def resolve_user_for_analysis(request):
    """Resolve a DB user for legacy analyze endpoint persistence."""
    if getattr(request, "user", None) and request.user.is_authenticated:
        return request.user

    username = (request.POST.get("username") or "").strip()
    full_name = (request.POST.get("full_name") or "").strip()
    email = (request.POST.get("email") or "").strip().lower()

    if not username:
        return None

    user, _ = User.objects.get_or_create(
        username=username,
        defaults={"email": email}
    )

    update_fields = []
    if email and user.email != email:
        user.email = email
        update_fields.append("email")

    if full_name:
        parts = full_name.split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
        if user.first_name != first_name:
            user.first_name = first_name
            update_fields.append("first_name")
        if user.last_name != last_name:
            user.last_name = last_name
            update_fields.append("last_name")

    if update_fields:
        user.save(update_fields=update_fields)

    return user


def persist_resume_analysis(user, resume_file, parsed_resume, recommendations):
    """Save parsed resume and generated recommendations to DB."""
    resume = Resume.objects.create(
        user=user,
        title=resume_file.name,
        file=resume_file,
        parsed_content=parsed_resume,
        skills=parsed_resume.get("technical_skills", {}),
        experience={"years": parsed_resume.get("experience_years", 0)},
        education={
            "degree": parsed_resume.get("degree"),
            "domain": parsed_resume.get("domain")
        }
    )

    for rec in recommendations:
        average_salary = rec.get("average_salary") or 0
        salary_text = f"${int(average_salary):,}" if isinstance(average_salary, (int, float)) and average_salary > 0 else ""
        CareerRecommendation.objects.create(
            user=user,
            resume=resume,
            career_title=rec.get("career_title", ""),
            match_score=rec.get("final_score", 0),
            description=(
                f"Semantic: {rec.get('semantic_score', 0)}%, "
                f"Market: {rec.get('market_score', 0)}%, "
                f"Open Jobs: {rec.get('job_count', 0)}"
            ),
            required_skills=rec.get("missing_skills", []),
            salary_range=salary_text,
            job_outlook=f"Market score {rec.get('market_score', 0)}"
        )

    create_resume_analysis_record(user, parsed_resume, recommendations)
    log_user_activity(user, f"Uploaded and analyzed resume: {resume.title}")
    return resume


def _flatten_skills(skills_payload):
    """Convert parsed technical skills payload into a flat string list."""
    if isinstance(skills_payload, list):
        return [str(skill).strip() for skill in skills_payload if str(skill).strip()]
    if isinstance(skills_payload, dict):
        normalized = []
        for values in skills_payload.values():
            if isinstance(values, list):
                normalized.extend(
                    str(skill).strip() for skill in values if str(skill).strip()
                )
            elif values:
                text = str(values).strip()
                if text:
                    normalized.append(text)
        return list(dict.fromkeys(normalized))
    return []


def create_resume_analysis_record(user, parsed_resume, recommendations):
    """Persist normalized analysis fields used by the profile dashboard."""
    skills = _flatten_skills(parsed_resume.get("technical_skills"))

    career_matches = []
    skill_gaps = []
    best_score = 0
    for rec in recommendations:
        title = str(rec.get("career_title", "")).strip()
        if title:
            career_matches.append(title)

        missing = rec.get("missing_skills", [])
        if isinstance(missing, list):
            skill_gaps.extend(str(item).strip() for item in missing if str(item).strip())

        score = rec.get("final_score", 0)
        try:
            score_value = float(score)
            if 0 <= score_value <= 1:
                score_value *= 100
            if score_value > best_score:
                best_score = score_value
        except (TypeError, ValueError):
            continue

    ResumeAnalysis.objects.create(
        user=user,
        skills=list(dict.fromkeys(skills))[:30],
        career_matches=list(dict.fromkeys(career_matches))[:10],
        skill_gaps=list(dict.fromkeys(skill_gaps))[:20],
        resume_score=max(0, min(100, int(round(best_score)))),
    )


def log_user_activity(user, action):
    if not user:
        return
    UserActivity.objects.create(user=user, action=action[:255])


def generate_ai_career_summary(skills, career_matches):
    if not skills and not career_matches:
        return "Upload and analyze your resume to generate a personalized AI career summary."

    fallback = (
        f"Your profile highlights strengths in {', '.join(skills[:5]) if skills else 'your detected skills'}. "
        f"Recommended directions include {', '.join(career_matches[:3]) if career_matches else 'roles aligned to your profile'}. "
        "Focus on consistent project experience and closing key skill gaps to improve role readiness."
    )

    try:
        if genai is None:
            return fallback
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return fallback

        prompt = (
            "User Skills: "
            f"{', '.join(skills) if skills else 'Not provided'}\n"
            "Career Matches: "
            f"{', '.join(career_matches) if career_matches else 'Not provided'}\n\n"
            "Write a short career summary explaining the user's strengths and recommended career direction."
        )

        preferred_model = (os.getenv("GEMINI_MODEL") or "gemini-3-flash-preview").strip()
        model_candidates = []
        for model_name in [preferred_model, "gemini-2.0-flash"]:
            if model_name and model_name not in model_candidates:
                model_candidates.append(model_name)

        client = genai.Client(api_key=api_key)
        for model_name in model_candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                text = (getattr(response, "text", "") or "").strip()
                if text:
                    return text
            except Exception as model_error:
                logger.warning("Career summary model failed for %s: %s", model_name, model_error)
                continue
    except Exception as error:
        logger.warning("Career summary generation failed: %s", error)

    return fallback


# ==================== ViewSets for REST API ====================

class UserProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint for user profiles.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def get_object(self):
        obj, created = UserProfile.objects.get_or_create(user=self.request.user)
        return obj

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        if request.method == "GET":
            serializer = self.get_serializer(profile)
            return Response(serializer.data)

        serializer = self.get_serializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        """Update current user's profile"""
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResumeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for resume management.
    """
    serializer_class = ResumeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def upload_and_analyze(self, request):
        """Upload resume and automatically parse it"""
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No resume file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        resume_file = request.FILES['file']
        title = request.data.get('title', resume_file.name)
        _, extension = os.path.splitext(resume_file.name or "")
        suffix = extension.lower() if extension else ".pdf"
        temp_path = None

        # Save file temporarily using a unique path to avoid collisions.
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as destination:
            temp_path = destination.name
            for chunk in resume_file.chunks():
                destination.write(chunk)

        try:
            # Parse resume
            parsed_resume = parse_resume(temp_path)
            recommendations = recommend_careers(parsed_resume)

            # Create resume record
            resume = Resume.objects.create(
                user=request.user,
                title=title,
                file=resume_file,
                parsed_content=parsed_resume,
                skills=parsed_resume.get('technical_skills', {}),
                experience={'years': parsed_resume.get('experience_years', 0)},
                education={
                    'degree': parsed_resume.get('degree'),
                    'domain': parsed_resume.get('domain')
                }
            )

            # Save recommendations
            for rec in recommendations:
                average_salary = rec.get('average_salary') or 0
                salary_text = f"${int(average_salary):,}" if isinstance(average_salary, (int, float)) and average_salary > 0 else ""
                CareerRecommendation.objects.create(
                    user=request.user,
                    resume=resume,
                    career_title=rec.get('career_title', ''),
                    match_score=rec.get('final_score', 0),
                    description=(
                        f"Semantic: {rec.get('semantic_score', 0)}%, "
                        f"Market: {rec.get('market_score', 0)}%, "
                        f"Open Jobs: {rec.get('job_count', 0)}"
                    ),
                    required_skills=rec.get('missing_skills', []),
                    salary_range=salary_text,
                    job_outlook=f"Market score {rec.get('market_score', 0)}"
                )

            create_resume_analysis_record(request.user, parsed_resume, recommendations)
            log_user_activity(request.user, f"Uploaded and analyzed resume: {title}")

            serializer = self.get_serializer(resume)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Resume analysis failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    @action(detail=True, methods=['get'])
    def recommendations(self, request, pk=None):
        """Get all recommendations for a specific resume"""
        resume = self.get_object()
        recommendations = CareerRecommendation.objects.filter(resume=resume)
        serializer = CareerRecommendationSerializer(recommendations, many=True)
        return Response(serializer.data)


class CareerRecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for career recommendations (read-only).
    """
    serializer_class = CareerRecommendationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CareerRecommendation.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def top_matches(self, request):
        threshold = float(request.query_params.get('threshold', 20))

        all_recommendations = self.get_queryset().order_by('-match_score')

        filtered = all_recommendations.filter(match_score__gt=threshold)

        serializer = self.get_serializer(filtered, many=True)

        return Response({
            "total_matches": filtered.count(),
            "results": serializer.data[:5]
        })

class JobOpportunityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for job opportunities.
    """
    serializer_class = JobOpportunitySerializer
    queryset = JobOpportunity.objects.all()
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search jobs by title, company, or location"""
        query = request.query_params.get('q', '')
        jobs = self.queryset.filter(
            title__icontains=query
        ) | self.queryset.filter(
            company__icontains=query
        ) | self.queryset.filter(
            location__icontains=query
        )
        serializer = self.get_serializer(jobs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Filter jobs by location"""
        location = request.query_params.get('location', '')
        jobs = self.queryset.filter(location__icontains=location)
        serializer = self.get_serializer(jobs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_title(self, request):
        """Filter jobs by career title"""
        title = request.query_params.get('title', '')
        jobs = self.queryset.filter(title__icontains=title)
        serializer = self.get_serializer(jobs, many=True)
        return Response(serializer.data)


class SavedJobViewSet(viewsets.ModelViewSet):
    """
    API endpoint for saved jobs.
    """
    serializer_class = SavedJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedJob.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def save_job(self, request):
        """Save a job for later"""
        job_id = request.data.get('job_id')
        notes = request.data.get('notes', '')

        try:
            job = JobOpportunity.objects.get(id=job_id)
            saved_job, created = SavedJob.objects.get_or_create(
                user=request.user,
                job=job,
                defaults={'notes': notes}
            )
            serializer = self.get_serializer(saved_job)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except JobOpportunity.DoesNotExist:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for chat messages.
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatMessage.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def send_message(self, request):
        """Send a message to career guidance chatbot"""
        message_text = request.data.get('message', '')

        if not message_text:
            return Response(
                {'error': 'Message cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # TODO: Integrate with actual chatbot AI
            response_text = f"Thank you for your message: {message_text}"

            chat_message = ChatMessage.objects.create(
                user=request.user,
                message=message_text,
                response=response_text,
                message_type='user'
            )

            serializer = self.get_serializer(chat_message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Failed to process message: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get chat history for current user"""
        messages = self.get_queryset().order_by('timestamp')
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)


# ==================== Traditional API Endpoints ====================

def _normalize_context_list(value):
    """Normalize a context field into a clean string list."""
    if not isinstance(value, list):
        return []
    normalized = []
    for item in value:
        text = str(item).strip()
        if text:
            normalized.append(text)
    return normalized


@csrf_exempt
@require_http_methods(["POST"])
def chat_api(request):
    """Resume-aware chatbot endpoint powered by Gemini."""
    fallback_reply = "AI service is temporarily unavailable. Please try again later."

    # Allow authenticated session users or Bearer JWT users.
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        auth_result = JWTAuthentication().authenticate(request)
        if auth_result:
            request.user = auth_result[0]

    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return JsonResponse({"reply": "Authentication credentials were not provided."}, status=401)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"reply": "Invalid JSON payload."}, status=400)

    user_message = str(payload.get("message", "")).strip()
    resume_context = payload.get("resume_context", {})
    if not isinstance(resume_context, dict):
        resume_context = {}

    skills = _normalize_context_list(resume_context.get("skills"))
    career_matches = _normalize_context_list(resume_context.get("career_matches"))
    skill_gaps = _normalize_context_list(resume_context.get("skill_gaps"))

    if not user_message:
        return JsonResponse({"reply": "Message cannot be empty."}, status=400)

    prompt = (
        "You are PathVera AI Career Coach.\n\n"
        "User Resume Data:\n"
        f"Skills: {', '.join(skills) if skills else 'Not provided'}\n"
        f"Career Matches: {', '.join(career_matches) if career_matches else 'Not provided'}\n"
        f"Skill Gaps: {', '.join(skill_gaps) if skill_gaps else 'Not provided'}\n\n"
        "User Question:\n"
        f"{user_message}\n\n"
        "Use the resume data as context, but only when relevant to the user's exact question.\n\n"
        "Response rules (must follow):\n"
        "1) Respond ONLY to what the user asked.\n"
        "2) Keep responses concise: maximum 3-6 lines unless the user explicitly asks for a detailed analysis.\n"
        "3) Do NOT generate a full career report automatically.\n"
        "4) Generate sections like 'Career Analysis', 'Strengths', 'Skill Gaps', and 'Suggestions' ONLY when the user specifically asks for full/profile analysis.\n"
        "5) Use bullet points when listing items.\n"
        "6) Avoid long paragraphs.\n"
        "7) Keep output clean, conversational, and in Markdown.\n"
        "8) If the message is a greeting (e.g., hi/hello), reply with a brief greeting and ask how you can help."
    )

    try:
        if genai is None:
            raise ImportError("google-genai is not installed")

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Missing GEMINI_API_KEY")

        preferred_model = (os.getenv("GEMINI_MODEL") or "gemini-3-flash-preview").strip()
        model_candidates = []
        for model_name in [preferred_model, "gemini-2.0-flash"]:
            if model_name and model_name not in model_candidates:
                model_candidates.append(model_name)

        client = genai.Client(api_key=api_key)
        for model_name in model_candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                reply = (getattr(response, "text", "") or "").strip()
                if reply:
                    return JsonResponse({"reply": reply})
            except Exception as model_error:
                logger.warning("Gemini request failed for model %s: %s", model_name, model_error)
                continue

        return JsonResponse({"reply": fallback_reply}, status=503)
    except Exception as error:
        logger.exception("Chat API failed: %s", error)
        return JsonResponse({"reply": fallback_reply}, status=503)

@csrf_exempt
@require_http_methods(["POST"])
def analyze_resume(request):
    """
    Legacy endpoint for resume analysis.
    Kept for backward compatibility.
    """
    if "resume" not in request.FILES:
        return JsonResponse({"error": "No resume uploaded"}, status=400)

    resume_file = request.FILES["resume"]
    _, extension = os.path.splitext(resume_file.name or "")
    suffix = extension.lower() if extension else ".pdf"
    file_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as destination:
            file_path = destination.name
            for chunk in resume_file.chunks():
                destination.write(chunk)

        parsed_resume = parse_resume(file_path)
        recommendations = recommend_careers(parsed_resume)
        saved_resume_id = None
        save_error = None
        try:
            analysis_user = resolve_user_for_analysis(request)
            if analysis_user is None:
                return JsonResponse({"error": "Authentication required for analysis."}, status=401)
            saved_resume = persist_resume_analysis(
                user=analysis_user,
                resume_file=resume_file,
                parsed_resume=parsed_resume,
                recommendations=recommendations
            )
            saved_resume_id = saved_resume.id
        except Exception as persist_error:
            save_error = str(persist_error)

        payload = {
            "parsed_resume": parsed_resume,
            "recommendations": recommendations
        }
        if saved_resume_id:
            payload["saved_resume_id"] = saved_resume_id
        if save_error:
            payload["save_error"] = save_error

        return JsonResponse(payload)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
