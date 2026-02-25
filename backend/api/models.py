from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator

class UserProfile(models.Model):
    """Extended user profile for career recommendation system"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Resume(models.Model):
    """Store user resumes"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resumes')
    title = models.CharField(max_length=255)
    file = models.FileField(
        upload_to='resumes/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'docx', 'doc', 'txt'])]
    )
    parsed_content = models.JSONField(null=True, blank=True)
    skills = models.JSONField(null=True, blank=True)
    experience = models.JSONField(null=True, blank=True)
    education = models.JSONField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class CareerRecommendation(models.Model):
    """Store career recommendations for users"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='career_recommendations')
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, null=True, blank=True)
    career_title = models.CharField(max_length=255)
    match_score = models.FloatField()
    description = models.TextField(blank=True)
    required_skills = models.JSONField(null=True, blank=True)
    salary_range = models.CharField(max_length=100, blank=True)
    job_outlook = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-match_score']

    def __str__(self):
        return f"{self.user.username} - {self.career_title} ({self.match_score:.2f})"


class JobOpportunity(models.Model):
    """Store job opportunities from Adzuna API"""
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    description = models.TextField()
    salary_min = models.IntegerField(null=True, blank=True)
    salary_max = models.IntegerField(null=True, blank=True)
    url = models.URLField()
    posted_date = models.DateTimeField()
    source = models.CharField(max_length=100, default='adzuna')
    requirements = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-posted_date']

    def __str__(self):
        return f"{self.title} at {self.company}"


class SavedJob(models.Model):
    """Track jobs saved by users"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_jobs')
    job = models.ForeignKey(JobOpportunity, on_delete=models.CASCADE)
    saved_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('user', 'job')
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.user.username} - {self.job.title}"


class ChatMessage(models.Model):
    """Store chat messages for career guidance chatbot"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    message = models.TextField()
    response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    message_type = models.CharField(
        max_length=50,
        choices=[
            ('user', 'User Message'),
            ('bot', 'Bot Response'),
        ],
        default='user'
    )

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.timestamp}"
