# 🚀 PathVera – AI Powered Career Path Recommendation System

PathVera is an intelligent career recommendation platform that analyzes a user's resume, skills, and educational background to suggest suitable career paths using **Machine Learning and AI models**.

The system provides personalized career insights, job role recommendations, and skill-gap analysis to help users make better career decisions.

---

## ✨ Key Features

* 📄 **Resume Upload & Parsing**
  Extracts skills, education, and experience from uploaded resumes.

* 🤖 **AI Career Recommendation Engine**
  Uses NLP and semantic similarity to suggest the most relevant career paths.

* 📊 **Career Dashboard**
  Displays recommended roles, skill gaps, and market demand insights.

* 🔎 **Semantic Skill Matching**
  Uses embeddings to match user profiles with industry roles.

* 🌐 **Job Market Insights**
  Fetches real-world job data using APIs.

* 💬 **AI Career Chatbot**
  Helps users explore career options interactively.

---

## 🏗 System Architecture

User → Resume Upload → Resume Parser → Skill Extraction →
Embedding Model → Recommendation Engine → Career Dashboard

Technologies used ensure scalable and modular architecture.

---

## 🧠 Tech Stack

### Backend

* Python
* Django
* Django REST Framework

### Machine Learning

* NLP
* Sentence Embeddings
* Semantic Matching
* Recommendation Engine

### Frontend

* HTML
* CSS
* JavaScript

### Database

* SQLite (Development)

### APIs

* Job Market APIs
* AI APIs (Gemini / OpenAI)

---

## 📂 Project Structure

```
Pathvera
│
├── backend
│   ├── api
│   ├── core
│   ├── ml
│   │   ├── models
│   │   ├── pipeline
│   │   └── data
│   ├── static
│   ├── templates
│   └── manage.py
│
├── requirements.txt
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```
git clone https://github.com/PrakharPurwar12/pep_project_pathvera.git
cd pep_project_pathvera
```

### 2️⃣ Create Virtual Environment

```
python -m venv .venv
```

Activate:

**Windows**

```
.venv\Scripts\activate
```

**Mac/Linux**

```
source .venv/bin/activate
```

---

### 3️⃣ Install Dependencies

```
pip install -r backend/requirements.txt
```

---

### 4️⃣ Setup Environment Variables

Create a `.env` file inside **backend**

Example:

```
API_KEY=your_api_key_here
DEBUG=True
```

---

### 5️⃣ Run Migrations

```
python backend/manage.py migrate
```

---

### 6️⃣ Run Server

```
python backend/manage.py runserver
```

Open:

```
http://127.0.0.1:8000
```

---

## 📊 Core ML Pipeline

1. Resume Parsing
2. Skill Extraction
3. Semantic Embedding Generation
4. Career Profile Matching
5. Recommendation Generation
6. Dashboard Visualization

---

## 🔒 Security Best Practices

Sensitive files are excluded using `.gitignore`

```
.env
db.sqlite3
media/
__pycache__/
```

---

## 📈 Future Improvements

* Deploy using Docker
* Integrate more job market APIs
* Add real-time career trend analysis
* Improve recommendation accuracy
* Add user authentication with JWT

---

## 👨‍💻 Author

**Prakhar Purwar**

B.Tech CSE – Lovely Professional University
AI & Data Science Enthusiast

GitHub:
https://github.com/PrakharPurwar12

---

## ⭐ Support

If you found this project useful, consider giving it a **star on GitHub** ⭐
