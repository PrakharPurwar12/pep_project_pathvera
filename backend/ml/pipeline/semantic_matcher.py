import json
from sklearn.metrics.pairwise import cosine_similarity
from models.embedding_model import get_embedding

with open("data/career_profiles.json") as f:
    CAREERS = json.load(f)

career_embeddings = [
    get_embedding(c["description"])
    for c in CAREERS
]

def recommend(resume_text, top_k=5):

    resume_emb = get_embedding(resume_text)

    scores = cosine_similarity(
        [resume_emb],
        career_embeddings
    )[0]

    results = []

    for i, score in enumerate(scores):
        results.append({
            "career": CAREERS[i]["career"],
            "score": float(score)
        })

    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:top_k]
