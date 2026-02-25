import pdfplumber
import docx
import pandas as pd
import re
import os
import json
from pdf2image import convert_from_path
import pytesseract

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEGREE_DB_PATH = os.path.join(BASE_DIR, "data", "degrees.csv")
TECH_SKILLS_PATH = os.path.join(BASE_DIR, "data", "tech_skills.json")

def extract_text_from_pdf(file_path):
    text = ""

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    except Exception:
        pass

    if text.strip() == "":
        images = convert_from_path(file_path)
        for img in images:
            text += pytesseract.image_to_string(img)

    return text.lower()

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    text = "\n".join(p.text for p in doc.paragraphs)
    return text.lower()

def extract_resume_text(file_path):
    if file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    return ""

def extract_degree_and_domain(text):
    if not os.path.exists(DEGREE_DB_PATH):
        return None, None

    degrees_df = pd.read_csv(DEGREE_DB_PATH)
    text_clean = re.sub(r'\s+', ' ', text.lower())

    for _, row in degrees_df.iterrows():
        degree_name = str(row["degree"]).lower()
        domain = str(row["domain"]).lower()
        if degree_name in text_clean:
            return degree_name, domain

    if "b.tech" in text_clean or "btech" in text_clean:
        return "bachelor of technology", "technology"

    if "b.e" in text_clean:
        return "bachelor of engineering", "technology"

    return None, None

def load_tech_skills():
    if not os.path.exists(TECH_SKILLS_PATH):
        return {}

    with open(TECH_SKILLS_PATH, "r") as f:
        return json.load(f)

def normalize_skill(skill):
    return skill.replace(".", "").replace("-", "").strip()

def extract_technical_skills(text):
    skill_data = load_tech_skills()
    detected = {}

    section_match = re.search(
        r'skills(.*?)(projects|education|experience)',
        text,
        re.DOTALL
    )

    if not section_match:
        return {}

    skills_text = section_match.group(1).lower()

    for category, skills in skill_data.items():
        matched = []

        for skill in skills:
            pattern = r"\b" + re.escape(skill.lower()) + r"\b"

            if re.search(pattern, skills_text):
                matched.append(skill)

        if matched:
            detected[category] = matched

    return detected

def extract_experience_years(text):
    patterns = [
        r'(\d+)\+?\s*years',
        r'(\d+)\s*yrs',
        r'over\s*(\d+)\s*years',
        r'(\d+)\s*year'
    ]

    years_found = []

    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            years_found.append(int(match))

    if years_found:
        return max(years_found)

    return 0

def parse_resume(file_path):
    text = extract_resume_text(file_path)

    print("\n----- RAW TEXT PREVIEW -----\n")
    print(text[:500])
    print("\n----------------------------\n")

    degree, domain = extract_degree_and_domain(text)
    technical_skills = extract_technical_skills(text)
    experience_years = extract_experience_years(text)

    return {
        "degree": degree,
        "domain": domain,
        "technical_skills": technical_skills,
        "experience_years": experience_years
    }

if __name__ == "__main__":
    sample_path = os.path.join(BASE_DIR, "data", "sample_resume.pdf")

    if not os.path.exists(sample_path):
        print("Put sample_resume.pdf inside data/")
    else:
        result = parse_resume(sample_path)

        print("\nParsed Resume:\n")
        for k, v in result.items():
            print(k, ":", v)