document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("recommendationGrid");
    const modalWrap = document.getElementById("matchModalWrap");
    const closeBtn = document.getElementById("closeMatchModal");
    const subtitle = document.getElementById("matchSubtitle");
    const scoreText = document.getElementById("matchScoreText");
    const skillsText = document.getElementById("matchSkillsText");
    const insightText = document.getElementById("matchInsightText");
    const applyLink = document.getElementById("applyMatchLink");

    if (!grid || !modalWrap || !closeBtn || !subtitle || !scoreText || !skillsText || !insightText || !applyLink) return;

    const recommendations = loadRecommendations();
    renderRecommendations(grid, recommendations);
    bindMatchButtons(grid, modalWrap, subtitle, scoreText, skillsText, insightText, applyLink);

    closeBtn.addEventListener("click", () => closeModal(modalWrap));
    modalWrap.addEventListener("click", (event) => {
        if (event.target === modalWrap) closeModal(modalWrap);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modalWrap.classList.contains("open")) closeModal(modalWrap);
    });
});

function loadRecommendations() {
    try {
        const currentUser = getCurrentUserName();
        if (!currentUser) return [];
        const hasUploaded = localStorage.getItem(getResumeUploadedKey(currentUser)) === "1";
        if (!hasUploaded) return [];
        const raw = localStorage.getItem(getAnalysisStorageKey(currentUser));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
        if (!recommendations.length) return [];
        return recommendations;
    } catch (error) {
        return [];
    }
}

function renderRecommendations(grid, recommendations) {
    grid.innerHTML = "";
    if (!recommendations.length) {
        grid.innerHTML = `
            <article class="card recommendation-card">
                <div>
                    <h3>No recommendations yet</h3>
                    <p class="text-muted">Upload and analyze your resume to get matched jobs.</p>
                </div>
            </article>
        `;
        return;
    }

    recommendations.forEach((item) => {
        const score = clampScore(item.final_score ?? item.score ?? item.match_score);
        const missingSkills = Array.isArray(item.missing_skills) ? item.missing_skills.slice(0, 3) : [];
        const skillsText = missingSkills.length ? missingSkills.join(", ") : "No major skill gaps";
        const badgeClass = score < 80 ? "match-badge low" : "match-badge";
        const barClass = score < 80 ? "progress-fill low" : "progress-fill";
        const companyLabel = buildCompanyLabel(item);

        const card = document.createElement("article");
        card.className = "card recommendation-card";
        card.innerHTML = `
            <div class="recommendation-top">
                <div>
                    <h3>${escapeHtml(item.career_title || item.title || "Career Match")}</h3>
                    <p class="job-company">${escapeHtml(companyLabel)}</p>
                </div>
                <span class="${badgeClass}">${score}%</span>
            </div>
            <div class="progress-track"><div class="${barClass}" style="width:${score}%"></div></div>
            <p class="text-muted">Skills to add: ${escapeHtml(skillsText)}</p>
            <button class="btn btn-primary btn-block view-match-btn" type="button">View Match</button>
        `;
        grid.appendChild(card);
    });
}

function bindMatchButtons(grid, modalWrap, subtitle, scoreText, skillsText, insightText, applyLink) {
    grid.querySelectorAll(".recommendation-card .view-match-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const card = button.closest(".recommendation-card");
            if (!card) return;

            const role = (card.querySelector("h3")?.textContent || "Role").trim();
            const companyLocation = (card.querySelector(".job-company")?.textContent || "Company").trim();
            const score = (card.querySelector(".match-badge")?.textContent || "--").trim();
            const skillLine = (card.querySelector("p.text-muted")?.textContent || "").trim();
            const skills = skillLine.replace(/^skills to add:\s*/i, "").trim() || "No extra skills listed";

            subtitle.textContent = `${role} at ${companyLocation}`;
            scoreText.textContent = score;
            skillsText.textContent = skills;
            insightText.textContent = buildInsight(score, skills);
            applyLink.href = buildSearchUrl(role, companyLocation);

            modalWrap.classList.add("open");
            modalWrap.setAttribute("aria-hidden", "false");
        });
    });
}

function buildCompanyLabel(item) {
    if (item.company_location) return item.company_location;
    const jobs = Number(item.job_count || 0);
    if (jobs > 0) return `Market demand: ${jobs} jobs`;
    return "AI matched role";
}

function getCurrentUserName() {
    return (localStorage.getItem("pv-user-name") || "").trim().toLowerCase();
}

function getAnalysisStorageKey(username) {
    return `analysisData:${username}`;
}

function getResumeUploadedKey(username) {
    return `resumeUploaded:${username}`;
}

function clampScore(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    const rounded = Math.round(numeric);
    return Math.max(0, Math.min(100, rounded));
}

function closeModal(modalWrap) {
    modalWrap.classList.remove("open");
    modalWrap.setAttribute("aria-hidden", "true");
}

function buildInsight(score, skills) {
    const numericScore = parseInt(String(score).replace("%", ""), 10);
    const skillCount = skills.split(",").map((value) => value.trim()).filter(Boolean).length;

    if (!Number.isNaN(numericScore) && numericScore >= 90) {
        return "Strong fit. Update these skills quickly and apply first to maximize response chances.";
    }
    if (!Number.isNaN(numericScore) && numericScore >= 80) {
        return `Good fit. Close ${skillCount} priority skill gap(s), then apply with tailored resume keywords.`;
    }
    return "Moderate fit. Improve listed skills first, then re-check your resume match before applying.";
}

function buildSearchUrl(role, companyLocation) {
    const query = `${role} ${companyLocation} jobs`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
