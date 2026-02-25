from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile,
    Resume,
    CareerRecommendation,
    JobOpportunity,
    SavedJob,
    ChatMessage,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('id',)


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ('id', 'user', 'bio', 'phone_number', 'location', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = (
            'id', 'user', 'title', 'file', 'parsed_content',
            'skills', 'experience', 'education', 'uploaded_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'parsed_content', 'skills', 'experience', 'education', 'uploaded_at', 'updated_at')


class CareerRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerRecommendation
        fields = (
            'id', 'user', 'resume', 'career_title', 'match_score',
            'description', 'required_skills', 'salary_range', 'job_outlook',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class JobOpportunitySerializer(serializers.ModelSerializer):
    salary_range = serializers.SerializerMethodField()

    class Meta:
        model = JobOpportunity
        fields = (
            'id', 'title', 'company', 'location', 'description',
            'salary_min', 'salary_max', 'salary_range', 'url', 'posted_date',
            'source', 'requirements'
        )
        read_only_fields = ('id',)

    def get_salary_range(self, obj):
        if obj.salary_min and obj.salary_max:
            return f"${obj.salary_min:,} - ${obj.salary_max:,}"
        elif obj.salary_min:
            return f"${obj.salary_min:,}+"
        elif obj.salary_max:
            return f"Up to ${obj.salary_max:,}"
        return "Not specified"


class SavedJobSerializer(serializers.ModelSerializer):
    job = JobOpportunitySerializer(read_only=True)
    job_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = SavedJob
        fields = ('id', 'user', 'job', 'job_id', 'notes', 'saved_at')
        read_only_fields = ('id', 'user', 'saved_at')


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ('id', 'user', 'message', 'response', 'timestamp', 'message_type')
        read_only_fields = ('id', 'user', 'timestamp')
