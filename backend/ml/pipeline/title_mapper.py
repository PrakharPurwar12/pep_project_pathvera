import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def load_data():
    with open("data/career_titles.json") as f:
        career_titles = json.load(f)

    with open("data/onet_processed.json") as f:
        onet_profiles = json.load(f)

    return career_titles, onet_profiles


def map_titles():

    career_titles, onet_profiles = load_data()

    model = SentenceTransformer(MODEL_NAME)

    print("Embedding O*NET titles...")
    onet_titles = [profile["title"] for profile in onet_profiles]
    onet_embeddings = model.encode(onet_titles, show_progress_bar=True)

    print("Embedding career titles...")
    career_embeddings = model.encode(career_titles, show_progress_bar=True)

    mapping_results = []

    for i, career_title in enumerate(career_titles):

        career_vector = career_embeddings[i].reshape(1, -1)

        similarities = cosine_similarity(career_vector, onet_embeddings)[0]

        best_index = np.argmax(similarities)

        best_match = onet_profiles[best_index]

        mapping_results.append({
            "career_title": career_title,
            "matched_onet_title": best_match["title"],
            "similarity_score": float(similarities[best_index]),
            "onet_code": best_match["onet_code"]
        })

    with open("data/title_mapping.json", "w") as f:
        json.dump(mapping_results, f, indent=2)

    print("Title mapping completed.")


if __name__ == "__main__":
    map_titles()