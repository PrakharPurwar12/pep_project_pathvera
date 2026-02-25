# Quick Start Guide

## 1. Activate Virtual Environment

```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

## 2. Start Django Development Server

```bash
cd backend
python manage.py runserver
```

The server will be available at: **http://localhost:8000**

## 3. Create a Superuser (Admin Account)

In a new terminal:
```bash
cd backend
python manage.py createsuperuser
```

Follow the prompts to create an admin user.

## 4. Access the Admin Panel

Visit: **http://localhost:8000/admin/**

Login with the superuser credentials you just created.

## 5. Test the API

### Option A: Using the Browsable API
1. Visit http://localhost:8000/api/
2. Click on any endpoint to explore

### Option B: Using cURL
```bash
# Get authentication token
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Copy the access token from response

# Use the token to access protected endpoints
curl -X GET http://localhost:8000/api/profiles/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Option C: Using Postman
1. Create a POST request to `http://localhost:8000/api/token/`
2. Send raw JSON: `{"username":"admin","password":"your_password"}`
3. Copy the `access` token
4. Create another request (GET/POST/etc.)
5. In Headers, add: `Authorization: Bearer YOUR_TOKEN`

## Frontend Pages Available

- **Home**: http://localhost:8000/
- **Resume Upload**: http://localhost:8000/resume/
- **Dashboard**: http://localhost:8000/dashboard/
- **Recommendations**: http://localhost:8000/recommendations/
- **Chatbot**: http://localhost:8000/chatbot/
- **Login**: http://localhost:8000/login/
- **Register**: http://localhost:8000/register/

## API Endpoints Summary

### Authentication
- `POST /api/token/` - Get access token
- `POST /api/token/refresh/` - Refresh token

### User Management
- `GET /api/profiles/me/` - Get your profile
- `POST /api/profiles/update_profile/` - Update profile

### Resumes
- `GET /api/resumes/` - List your resumes
- `POST /api/resumes/upload_and_analyze/` - Upload and analyze resume

### Career Recommendations
- `GET /api/recommendations/` - Get all recommendations
- `GET /api/recommendations/top_matches/` - Get top 5 matches

### Jobs
- `GET /api/jobs/` - List all jobs
- `GET /api/jobs/search/?q=python` - Search jobs
- `GET /api/jobs/by_location/?location=newyork` - Filter by location

### Saved Jobs
- `GET /api/saved-jobs/` - Your saved jobs
- `POST /api/saved-jobs/save_job/` - Save a job

### Chat
- `POST /api/messages/send_message/` - Send message to chatbot
- `GET /api/messages/history/` - Get chat history

## Common Tasks

### Upload a Resume
```bash
curl -X POST http://localhost:8000/api/resumes/upload_and_analyze/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=My Resume" \
  -F "file=@resume.pdf"
```

### Search for Jobs
```bash
curl -X GET "http://localhost:8000/api/jobs/search/?q=python+developer" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Save a Job
```bash
curl -X POST http://localhost:8000/api/saved-jobs/save_job/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"job_id":1,"notes":"Looks interesting"}'
```

## File Structure

```
backend/
├── manage.py              # Django management script
├── db.sqlite3             # Database (auto-created)
├── requirements.txt       # Python dependencies
├── core/                  # Project settings
│   ├── settings.py        # Main configuration
│   ├── urls.py           # URL routing
│   └── wsgi.py           # WSGI configuration
├── api/                   # Main application
│   ├── models.py         # Database models
│   ├── views.py          # API views and pages
│   ├── serializers.py    # DRF serializers
│   ├── urls.py           # API routes
│   ├── admin.py          # Admin configuration
│   └── migration/        # Database migrations
├── ml/                    # ML models and pipelines
├── templates/             # HTML templates
└── static/                # CSS, JS, images
```

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Documentation Files

- **DJANGO_SETUP.md** - Detailed Django setup and configuration
- **API_DOCUMENTATION.md** - Complete API reference with examples
- **This file** - Quick start guide

## Troubleshooting

### Port 8000 Already in Use
```bash
python manage.py runserver 8080
```

### Database Issues
```bash
# Delete the database and recreate it
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

### Import Errors
Make sure virtual environment is activated and all packages are installed:
```bash
pip install -r requirements.txt
```

### ModuleNotFoundError: No module named 'rest_framework'
```bash
pip install djangorestframework djangorestframework-simplejwt
```

## Next Steps

1. ✅ Virtual environment set up
2. ✅ Django project configured
3. ✅ Database initialized
4. ✅ Admin panel ready
5. ✅ API endpoints available
6. Next: Build frontend components
7. Next: Integrate ML pipelines
8. Next: Deploy to production

## Support

For issues or questions:
1. Check the detailed documentation files
2. Visit Django documentation: https://docs.djangoproject.com/
3. Visit DRF documentation: https://www.django-rest-framework.org/
