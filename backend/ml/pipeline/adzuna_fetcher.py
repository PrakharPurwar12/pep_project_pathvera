import os
import json
import requests
import statistics


APP_ID = "cef42c56"
APP_KEY = "1f2538acc20b1f2fe3b9f8dccfffd00d"
COUNTRY = "in"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(BASE_DIR, "data", "market_cache.json")


def load_cache():
    if not os.path.exists(CACHE_PATH):
        return {}

    with open(CACHE_PATH, "r") as f:
        return json.load(f)


def save_cache(cache_data):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache_data, f, indent=4)


def fetch_market_data(job_title):

    cache = load_cache()

    if job_title in cache:
        return cache[job_title]

    if not APP_ID or not APP_KEY:
        return default_response()

    url = f"https://api.adzuna.com/v1/api/jobs/{COUNTRY}/search/1"

    params = {
        "app_id": APP_ID,
        "app_key": APP_KEY,
        "results_per_page": 100,
        "what": job_title
    }

    try:
        response = requests.get(url, params=params, timeout=10)

        if response.status_code != 200:
            return default_response()

        data = response.json()

        jobs = data.get("results", [])
        job_count = data.get("count", 0)

        salaries = []
        for job in jobs:
            salary_min = job.get("salary_min")
            salary_max = job.get("salary_max")

            if salary_min and salary_max:
                salaries.append((salary_min + salary_max) / 2)

        avg_salary = statistics.mean(salaries) if salaries else 0

        market_score = normalize_market_score(job_count)

        result = {
            "job_count": job_count,
            "average_salary": round(avg_salary, 2),
            "market_score": market_score
        }

        cache[job_title] = result
        save_cache(cache)

        return result

    except:
        return default_response()


def normalize_market_score(job_count):
    max_expected_jobs = 50000
    score = min(job_count / max_expected_jobs, 1)
    return round(score * 100, 2)


def default_response():
    return {
        "job_count": 0,
        "average_salary": 0,
        "market_score": 0
    }
