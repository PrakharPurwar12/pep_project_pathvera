import os
import tempfile
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from ml.pipeline.resume_parser import parse_resume
from ml.pipeline.recommendation_engine import recommend_careers

from .models import (
    UserProfile,
    Resume,
    CareerRecommendation,
    JobOpportunity,
    SavedJob,
    ChatMessage,
)
from .serializers import (
    UserProfileSerializer,
    ResumeSerializer,
    CareerRecommendationSerializer,
    JobOpportunitySerializer,
    SavedJobSerializer,
    ChatMessageSerializer,
)


#Frontend Pages

def index_page(request):
    return render(request, "index.html")

def resume_page(request):
    return render(request, "resume.html")

def dashboard_page(request):
    return render(request, "dashboard.html")

def recommendations_page(request):
    return render(request, "recommendations.html")

def chatbot_page(request):
    return render(request, "chatbot.html")

def profile_page(request):
    return render(request, "profile.html")

def login_page(request):
    return render(request, "login.html")

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

    return resume


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

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

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
