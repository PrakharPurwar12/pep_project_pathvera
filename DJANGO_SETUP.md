# Django Setup Guide

## Project Structure Overview

This is a full-featured Django application for a career recommendation system with resume analysis and job matching capabilities.

### Key Components

```
backend/
├── core/           # Django project settings and configuration
├── api/            # Main application with models, views, and serializers
├── ml/             # Machine learning models and data processing
├── templates/      # HTML templates for frontend
├── static/         # CSS, JavaScript, and static files
├── manage.py       # Django management script
└── requirements.txt # Project dependencies
```

## Environment Setup

### 1. Python Virtual Environment
A Python virtual environment has been created at `.venv/` with Python 3.14.3

### 2. Required Packages Installed
- **Django 6.0.2** - Web framework
- **Django REST Framework** - API framework
- **djangorestframework-simplejwt** - JWT authentication
- **django-cors-headers** - CORS support
- **All ML dependencies** - PyTorch, Transformers, scikit-learn, etc.

### 3. Database Setup
SQLite database is configured in `core/settings.py`

## Running the Project

### Start Development Server
```bash
python manage.py runserver
```
Server will run at: http://localhost:8000

### Create Admin User
```bash
python manage.py createsuperuser
```
Or using the management command:
```bash
python manage.py create_superuser --username admin --email admin@example.com --password password
```

Access admin panel at: http://localhost:8000/admin/

## Models Overview

### UserProfile
- Extends Django User model
- Stores user bio, location, phone number, and avatar
- One-to-one relationship with User

### Resume
- Stores uploaded resume files
- Automatically parses resume to extract skills, experience, and education
- Supports PDF, DOCX, DOC, and TXT formats
- Stores parsed_content as JSON

### CareerRecommendation
- Generated recommendations based on resume analysis
- Stores match score, required skills, salary range, and job outlook
- Linked to specific Resume and User

### JobOpportunity
- Job listings fetched from Adzuna API
- Stores title, company, location, salary, and requirements
- Ordered by posted date

### SavedJob
- Allows users to save jobs they're interested in
- Unique constraint ensures user can't save same job twice
- Includes user notes field

### ChatMessage
- Stores conversation history with career guidance chatbot
- Tracks messages and bot responses with timestamps

## API Endpoints

### Authentication
- `POST /api/token/` - Get JWT token
- `POST /api/token/refresh/` - Refresh JWT token

### User Profiles
- `GET /api/profiles/me/` - Get current user's profile
- `POST /api/profiles/update_profile/` - Update user profile

### Resumes
- `GET /api/resumes/` - List user's resumes
- `POST /api/resumes/` - Upload new resume
- `POST /api/resumes/upload_and_analyze/` - Upload and auto-analyze resume
- `GET /api/resumes/{id}/recommendations/` - Get recommendations for resume

### Career Recommendations
- `GET /api/recommendations/` - List all user's recommendations
- `GET /api/recommendations/top_matches/` - Get top 5 recommendations

### Job Opportunities
- `GET /api/jobs/` - List all jobs
- `GET /api/jobs/search/` - Search jobs by title/company/location
- `GET /api/jobs/by_location/` - Filter by location
- `GET /api/jobs/by_title/` - Filter by job title

### Saved Jobs
- `GET /api/saved-jobs/` - List user's saved jobs
- `POST /api/saved-jobs/` - Save a job

### Chat Messages
- `POST /api/messages/send_message/` - Send message to chatbot
- `GET /api/messages/history/` - Get chat history

## Admin Interface

The Django admin panel is fully configured with:

### UserProfile Admin
- Display: User, Location, Created Date
- Search: Username, email, location
- Filterable by creation date

### Resume Admin
- Display: Title, User, Upload Date
- View parsed data (skills, experience, education)
- Collapsible sections for detailed inspection

### CareerRecommendation Admin
- Color-coded match scores (green: 70%+, orange: 50%+, red: <50%)
- Search by career title or username
- Filter by creation date and score

### JobOpportunity Admin
- Display salary ranges nicely
- Link to job posting URL
- Collapsible sections for detailed requirements

### SavedJob Admin
- Track user's saved jobs
- View and edit notes

### ChatMessage Admin
- Preview of messages
- Search through chat history
- Filter by date and message type

## Configuration Settings

### REST Framework (`core/settings.py`)
- **Authentication**: JWT (SimpleJWT)
- **Pagination**: PageNumberPagination (20 items per page)
- **Default Filters**: SearchFilter, OrderingFilter
- **Renderers**: JSON and Browsable API

### JWT Settings
- Access token lifetime: 60 minutes
- Refresh token lifetime: 1 day
- Token rotation enabled
- Algorithm: HS256

### CORS Settings
- All origins allowed (for development)
- Configurable allowed origins
- Credentials allowed for authentication

### Media Files
- Uploaded resumes stored in `media/resumes/`
- User avatars stored in `media/avatars/`
- Configure `MEDIA_ROOT` and `MEDIA_URL` in settings

## Frontend Integration

### Template Pages
All pages are server-rendered with Django templates:
- `/` - Home/Index page
- `/resume/` - Resume upload page
- `/dashboard/` - User dashboard
- `/recommendations/` - Career recommendations
- `/chatbot/` - AI chatbot interface
- `/login/` - Login page
- `/register/` - Registration page

### Static Files
Located in `static/` directory:
- CSS: `static/css/` (auth.css, base.css, dashboard.css)
- JavaScript: `static/js/` (auth.js, chatbot.js, core.js, dashboard.js, resume_upload.js)

## Database Migrations

The following migrations are included:
1. Initial Django setup (auth, sessions, admin)
2. Core models (UserProfile, Resume, CareerRecommendation, JobOpportunity, SavedJob, ChatMessage)

To create new migrations after model changes:
```bash
python manage.py makemigrations
python manage.py migrate
```

## Useful Management Commands

```bash
# Makemigrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test

# Shell to interact with database
python manage.py shell

# Collect static files
python manage.py collectstatic
```

## Security Notes

⚠️ **For Development Only**
- `DEBUG = True` is enabled
- `SECRET_KEY` is exposed in settings
- `ALLOWED_HOSTS = ['*']`
- `CORS_ALLOW_ALL_ORIGINS = True`

### Production Checklist
Before deploying to production:
1. Set `DEBUG = False`
2. Update `SECRET_KEY` to a secure random key
3. Restrict `ALLOWED_HOSTS` to your domain
4. Configure CORS properly
5. Use environment variables for sensitive data
6. Set up PostgreSQL instead of SQLite
7. Enable HTTPS
8. Configure proper static/media file serving

## Troubleshooting

### ModuleNotFoundError
If you get import errors, ensure virtual environment is activated:
```bash
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux
```

### Database Locked
If you get "database is locked" error:
1. Close all Django servers
2. Delete `db.sqlite3`
3. Run migrations again

### Port Already in Use
If port 8000 is already in use:
```bash
python manage.py runserver 0.0.0.0:8080
```

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [SimpleJWT Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Django CORS Headers](https://github.com/adamchainz/django-cors-headers)
