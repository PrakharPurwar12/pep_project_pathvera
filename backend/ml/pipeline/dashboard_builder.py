import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_FILE = "models/profile_embeddings.pkl"

model = SentenceTransformer(MODEL_NAME)


def load_profiles():
    with open(EMBEDDING_FILE, "rb") as f:
        data = pickle.load(f)
    return data["profiles"], data["embeddings"]


def build_resume_profile(parsed_resume):
    combined = (
        "Degree: " + str(parsed_resume.get("degree", "")) + " " +
        "Experience: " + str(parsed_resume.get("experience_years", "")) + " years " +
        "Technical Skills: " + " ".join(parsed_resume.get("technical_skills", [])) + " " +
        "Soft Skills: " + " ".join(parsed_resume.get("soft_skills", [])) + " " +
        parsed_resume.get("raw_text", "")
    )
    return combined.strip()


def semantic_skill_match(resume_embedding, skills, threshold=0.35):
    matched = []
    for skill in skills:
        skill_embedding = model.encode([skill])[0]
        similarity = cosine_similarity(
            [resume_embedding],
            [skill_embedding]
        )[0][0]
        if similarity >= threshold:
            matched.append(skill)
    return matched


def build_dashboard_summary(parsed_resume, top_k=5):

    profiles, profile_embeddings = load_profiles()

    resume_text = build_resume_profile(parsed_resume)
    resume_embedding = model.encode([resume_text])[0]

    similarities = cosine_similarity(
        [resume_embedding],
        profile_embeddings
    )[0]

    ranked_indices = np.argsort(similarities)[::-1]

    job_matches = 0
    for idx in ranked_indices:
        match_percentage = float(similarities[idx]) * 100
        if match_percentage > 20:
            job_matches += 1

    top_indices = ranked_indices[:top_k]
    top_similarities = similarities[top_indices]

    top_jobs = []

    for idx in top_indices:
        profile = profiles[idx]
        match_percentage = round(float(similarities[idx]) * 100, 2)

        tag = (
            "Hot" if match_percentage > 80
            else "New" if match_percentage > 65
            else "Normal"
        )

        top_jobs.append({
            "career_title": profile["career_title"],
            "match_percentage": match_percentage,
            "tag": tag
        })

    best_profile = profiles[top_indices[0]]
    best_similarity = top_similarities[0]

    matched_skills = semantic_skill_match(
        resume_embedding,
        best_profile.get("skills", [])
    )

    total_target_skills = len(best_profile.get("skills", []))
    skills_mastered = len(matched_skills)

    skill_match_ratio = (
        skills_mastered / total_target_skills
        if total_target_skills else 0
    )

    resume_score = round(
        (np.mean(top_similarities[:3]) * 70) +
        (skill_match_ratio * 30)
    )

    resume_fit = round(best_similarity * 100)

    interview_readiness = round(skill_match_ratio * 100)

    job_match_strength = round(
        (best_similarity * 0.7 + skill_match_ratio * 0.3) * 100
    )

    skill_gaps = list(
        set(best_profile.get("skills", [])) - set(matched_skills)
    )

    return {
        "resume_score": resume_score,
        "job_matches": job_matches,
        "skills_mastered": skills_mastered,
        "total_target_skills": total_target_skills,
        "resume_fit": resume_fit,
        "interview_readiness": interview_readiness,
        "job_match_strength": job_match_strength,
        "top_jobs": top_jobs,
        "skill_gaps": skill_gaps[:5]
    }