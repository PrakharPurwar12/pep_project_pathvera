import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from ml.pipeline.resume_parser import parse_resume
from ml.pipeline.adzuna_fetcher import fetch_market_data

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBEDDING_FILE = os.path.join(BASE_DIR, "models", "profile_embeddings.pkl")

model = SentenceTransformer(MODEL_NAME)

def load_profiles():
    with open(EMBEDDING_FILE, "rb") as f:
        data = pickle.load(f)
    return data["profiles"], data["embeddings"]


def flatten_skills(skill_data):
    if isinstance(skill_data, dict):
        flat = []
        for skills in skill_data.values():
            flat.extend(skills)
        return list(set(flat))
    elif isinstance(skill_data, list):
        return list(set(skill_data))
    return []

def build_resume_profile(parsed_resume):

    flat_skills = flatten_skills(parsed_resume.get("technical_skills", {}))

    combined = (
        "Degree: " + str(parsed_resume.get("degree", "")) + " " +
        "Experience: " + str(parsed_resume.get("experience_years", 0)) + " years " +
        "Technical Skills: " + " ".join(flat_skills)
    )

    return combined.strip().lower()

def calculate_skill_gap(resume_embedding, career_profile, threshold=0.35):

    matched = []
    missing = []

    for skill in career_profile.get("skills", []):
        skill_embedding = model.encode([skill])[0]

        similarity = cosine_similarity(
            [resume_embedding],
            [skill_embedding]
        )[0][0]

        if similarity >= threshold:
            matched.append(skill)
        else:
            missing.append(skill)

    return matched, missing


def get_dynamic_weights(experience_years):

    if experience_years <= 2:
        return 0.6, 0.4
    elif 3 <= experience_years <= 7:
        return 0.7, 0.3
    else:
        return 0.8, 0.2

def recommend_careers(parsed_resume, top_k=5):

    profiles, profile_embeddings = load_profiles()

    resume_text = build_resume_profile(parsed_resume)
    resume_embedding = model.encode([resume_text])[0]

    similarities = cosine_similarity(
        [resume_embedding],
        profile_embeddings
    )[0]

    ranked_indices = np.argsort(similarities)[::-1]

    experience = parsed_resume.get("experience_years", 0)
    semantic_weight, market_weight = get_dynamic_weights(experience)

    results = []

    for idx in ranked_indices:

        profile = profiles[idx]
        semantic_score = float(similarities[idx]) * 100

        market_data = fetch_market_data(profile["career_title"])
        market_score = market_data.get("market_score", 0)

        final_score = (
            semantic_score * semantic_weight +
            market_score * market_weight
        )

        matched_skills, missing_skills = calculate_skill_gap(
            resume_embedding,
            profile
        )

        results.append({
            "career_title": profile["career_title"],
            "semantic_score": round(semantic_score, 2),
            "market_score": market_score,
            "final_score": round(final_score, 2),
            "semantic_weight": semantic_weight,
            "market_weight": market_weight,
            "job_count": market_data.get("job_count", 0),
            "average_salary": market_data.get("average_salary", 0),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills[:5]
        })

    results = sorted(results, key=lambda x: x["final_score"], reverse=True)

    results = [r for r in results if r["final_score"] > 20]

    return results

if __name__ == "__main__":

    resume_path = "data/sample_resume.pdf"

    parsed_resume = parse_resume(resume_path)

    recommendations = recommend_careers(parsed_resume)

    print("\nCareer Recommendations:\n")

    for r in recommendations:
        print("Career:", r["career_title"])
        print("Semantic Score:", r["semantic_score"], "%")
        print("Market Score:", r["market_score"], "%")
        print("Final Score:", r["final_score"], "%")
        print("Weights -> Semantic:", r["semantic_weight"], 
              "Market:", r["market_weight"])
        print("Jobs Available:", r["job_count"])
        print("Average Salary:", r["average_salary"])
        print("Matched Skills:", r["matched_skills"])
        print("Missing Skills:", r["missing_skills"])
        print("-" * 60)