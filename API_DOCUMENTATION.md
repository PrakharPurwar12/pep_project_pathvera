# API Documentation

## Base URL
```
http://localhost:8000/api/
```

## Authentication

### Get Access Token
```
POST /token/

Request:
{
    "username": "your_username",
    "password": "your_password"
}

Response:
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Refresh Access Token
```
POST /token/refresh/

Request:
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response:
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Using Token in Requests
Include the token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

---

## Endpoints

### 1. User Profiles

#### Get Current User Profile
```
GET /profiles/me/

Headers: Authorization: Bearer <token>

Response:
{
    "id": 1,
    "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe"
    },
    "bio": "Software developer interested in AI",
    "phone_number": "+1234567890",
    "location": "New York",
    "created_at": "2026-02-22T10:30:00Z",
    "updated_at": "2026-02-22T10:30:00Z"
}
```

#### Update User Profile
```
POST /profiles/update_profile/

Headers: Authorization: Bearer <token>
Content-Type: application/json

Request:
{
    "bio": "Updated bio",
    "phone_number": "+9876543210",
    "location": "San Francisco"
}

Response:
{
    "id": 1,
    "user": {...},
    "bio": "Updated bio",
    "phone_number": "+9876543210",
    "location": "San Francisco",
    "created_at": "2026-02-22T10:30:00Z",
    "updated_at": "2026-02-22T11:00:00Z"
}
```

---

### 2. Resumes

#### List User's Resumes
```
GET /resumes/

Headers: Authorization: Bearer <token>

Response:
[
    {
        "id": 1,
        "user": 1,
        "title": "My Resume",
        "file": "/media/resumes/resume_123.pdf",
        "parsed_content": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890"
        },
        "skills": ["Python", "Django", "Machine Learning"],
        "experience": [...],
        "education": [...],
        "uploaded_at": "2026-02-22T10:30:00Z",
        "updated_at": "2026-02-22T10:30:00Z"
    }
]
```

#### Upload and Analyze Resume
```
POST /resumes/upload_and_analyze/

Headers: 
    Authorization: Bearer <token>
    Content-Type: multipart/form-data

Request:
{
    "title": "My Resume",
    "file": <PDF/DOCX/DOC/TXT file>
}

Response:
{
    "id": 1,
    "user": 1,
    "title": "My Resume",
    "file": "/media/resumes/resume_123.pdf",
    "parsed_content": {...},
    "skills": ["Python", "Django"],
    "experience": [...],
    "education": [...],
    "uploaded_at": "2026-02-22T10:30:00Z",
    "updated_at": "2026-02-22T10:30:00Z"
}
```

#### Get Recommendations for Specific Resume
```
GET /resumes/{id}/recommendations/

Headers: Authorization: Bearer <token>

Response:
[
    {
        "id": 1,
        "user": 1,
        "resume": 1,
        "career_title": "Data Scientist",
        "match_score": 0.85,
        "description": "Great match for your profile",
        "required_skills": ["Python", "ML", "Statistics"],
        "salary_range": "$100,000 - $150,000",
        "job_outlook": "Growing",
        "created_at": "2026-02-22T10:30:00Z",
        "updated_at": "2026-02-22T10:30:00Z"
    }
]
```

---

### 3. Career Recommendations

#### Get All Recommendations
```
GET /recommendations/

Headers: Authorization: Bearer <token>

Response:
[
    {
        "id": 1,
        "user": 1,
        "resume": 1,
        "career_title": "Data Scientist",
        "match_score": 0.85,
        ...
    }
]
```

#### Get Top Matches
```
GET /recommendations/top_matches/?limit=5

Headers: Authorization: Bearer <token>

Response:
[
    {
        "id": 1,
        "career_title": "Data Scientist",
        "match_score": 0.92
    },
    {
        "id": 2,
        "career_title": "Machine Learning Engineer",
        "match_score": 0.88
    }
]
```

---

### 4. Job Opportunities

#### List All Jobs
```
GET /jobs/

Query Parameters:
    - search: Search term
    - page: Page number
    - page_size: Results per page

Response:
{
    "count": 1250,
    "next": "http://localhost:8000/api/jobs/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "title": "Senior Python Developer",
            "company": "Tech Corp",
            "location": "New York, NY",
            "description": "We're hiring...",
            "salary_min": 100000,
            "salary_max": 150000,
            "salary_range": "$100,000 - $150,000",
            "url": "https://example.com/jobs/1",
            "posted_date": "2026-02-22T10:30:00Z",
            "source": "adzuna",
            "requirements": ["Python", "Django", "PostgreSQL"]
        }
    ]
}
```

#### Search Jobs
```
GET /jobs/search/?q=python+developer

Response:
[
    {
        "id": 1,
        "title": "Senior Python Developer",
        "company": "Tech Corp",
        ...
    }
]
```

#### Filter by Location
```
GET /jobs/by_location/?location=new+york

Response:
[
    {
        "id": 1,
        "title": "Senior Python Developer",
        "location": "New York, NY",
        ...
    }
]
```

#### Filter by Title
```
GET /jobs/by_title/?title=data+scientist

Response:
[
    {
        "id": 5,
        "title": "Data Scientist",
        "company": "AI Company",
        ...
    }
]
```

---

### 5. Saved Jobs

#### List Saved Jobs
```
GET /saved-jobs/

Headers: Authorization: Bearer <token>

Response:
[
    {
        "id": 1,
        "user": 1,
        "job": {
            "id": 1,
            "title": "Senior Python Developer",
            "company": "Tech Corp",
            ...
        },
        "notes": "Applied on 2026-02-22",
        "saved_at": "2026-02-22T10:30:00Z"
    }
]
```

#### Save a Job
```
POST /saved-jobs/save_job/

Headers: 
    Authorization: Bearer <token>
    Content-Type: application/json

Request:
{
    "job_id": 1,
    "notes": "Looks interesting, will apply soon"
}

Response:
{
    "id": 1,
    "user": 1,
    "job": {...},
    "notes": "Looks interesting, will apply soon",
    "saved_at": "2026-02-22T10:30:00Z"
}
```

#### Delete Saved Job
```
DELETE /saved-jobs/{id}/

Headers: Authorization: Bearer <token>

Response: 204 No Content
```

---

### 6. Chat Messages

#### Send Message to Chatbot
```
POST /messages/send_message/

Headers: 
    Authorization: Bearer <token>
    Content-Type: application/json

Request:
{
    "message": "What are the best careers for a Python developer?"
}

Response:
{
    "id": 1,
    "user": 1,
    "message": "What are the best careers for a Python developer?",
    "response": "Based on your skills...",
    "timestamp": "2026-02-22T10:30:00Z",
    "message_type": "user"
}
```

#### Get Chat History
```
GET /messages/history/

Headers: Authorization: Bearer <token>

Response:
[
    {
        "id": 1,
        "user": 1,
        "message": "What are the best careers?",
        "response": "Based on your profile...",
        "timestamp": "2026-02-22T10:30:00Z",
        "message_type": "user"
    },
    {
        "id": 2,
        "user": 1,
        "message": "Tell me more about data science",
        "response": "Data science is...",
        "timestamp": "2026-02-22T10:31:00Z",
        "message_type": "user"
    }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
    "error": "Invalid request data",
    "detail": "Field 'username' is required"
}
```

### 401 Unauthorized
```json
{
    "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
    "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
    "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
    "detail": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting is configured. Implement rate limiting in production using:
- Django REST Framework throttling
- django-ratelimit
- Or use API Gateway rate limiting

---

## Pagination

Default page size: 20 items
Example paginated response:
```
GET /jobs/?page=1&page_size=50

Response:
{
    "count": 1250,
    "next": "http://localhost:8000/api/jobs/?page=2&page_size=50",
    "previous": null,
    "results": [...]
}
```

---

## Filtering and Search

### Filter Operators
- Exact match: `?field=value`
- Contains (for search): `?search=value`
- Greater than: Not currently supported
- Less than: Not currently supported

### Search Fields
Resume search: title, user__username
Job search: title, company, location
ChatMessage search: message, response

---

## Testing the API

### Using cURL
```bash
# Get token
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"password"}'

# Use token
curl -X GET http://localhost:8000/api/profiles/me/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Python Requests
```python
import requests

# Get token
response = requests.post('http://localhost:8000/api/token/', json={
    'username': 'john',
    'password': 'password'
})
token = response.json()['access']

# Use token
headers = {'Authorization': f'Bearer {token}'}
response = requests.get('http://localhost:8000/api/profiles/me/', headers=headers)
print(response.json())
```

### Using Postman
1. Import the API collection
2. Set up environment variables for `base_url` and `token`
3. Use `{{base_url}}` and `{{token}}` in requests
4. Remember to update token after login

---

## API Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Request successful, no response body |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Permission denied |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal error |

---

## Future Enhancements

- [ ] Implement advanced filtering
- [ ] Add sorting capabilities
- [ ] Real-time chatbot integration
- [ ] Resume similarity scoring
- [ ] Job recommendation algorithm
- [ ] Email notifications
- [ ] Webhook support
- [ ] GraphQL API alternative
