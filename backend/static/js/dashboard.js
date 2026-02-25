document.addEventListener("DOMContentLoaded", function () {
    bindInsightToggle();
    setDashboardState(false);

    const data = loadCurrentUserAnalysis();
    if (!data) {
        setText("resumeScore", 0);
        setText("jobMatches", 0);
        setText("skillsMastered", 0);
        setText("semanticScore", "0%");
        setText("marketScore", "0%");
        setText("scoreWeights", "--");
        setText("jobMatchesMeta", "Based on 0 applications");
        setText("resumeScoreNote", "Based on your latest analysis snapshot");
        setText("dashboardFreshness", "No recent analysis");
        renderJobs([]);
        renderSkillGaps([]);
        return;
    }
    setDashboardState(true);

    const recommendations = data.recommendations || [];
    const parsed = data.parsed_resume || {};
    const topRecommendation = recommendations[0] || {};

    const resumeScore = recommendations.length > 0 ? Math.round(recommendations[0].final_score) : 0;
    const jobCount = recommendations.length;
    const skillsCount = countTechnicalSkills(parsed.technical_skills);

    setText("resumeScore", resumeScore);
    setText("jobMatches", jobCount);
    setText("skillsMastered", skillsCount);
    setText("semanticScore", `${formatPercent(topRecommendation.semantic_score)}%`);
    setText("marketScore", `${formatPercent(topRecommendation.market_score)}%`);
    setText(
        "scoreWeights",
        `${formatWeight(topRecommendation.semantic_weight)} / ${formatWeight(topRecommendation.market_weight)}`
    );
    setText("jobMatchesMeta", `Based on ${jobCount} application${jobCount === 1 ? "" : "s"}`);
    setText(
        "resumeScoreNote",
        resumeScore >= 75 ? "Strong baseline for target roles" : "Room to improve targeted role readiness"
    );
    setText("dashboardFreshness", "Updated from latest resume analysis");

    createSkillChart(resumeScore);
    renderJobs(recommendations);
    renderSkillGaps(recommendations);
});

function setDashboardState(hasAnalysis) {
    const emptyState = document.getElementById("dashboardEmptyState");
    const chartCard = document.querySelector(".chart-card");
    const scoreBreakdownCard = document.getElementById("scoreBreakdownCard");
    const insightsSection = document.querySelector(".top-gap");

    if (emptyState) emptyState.classList.toggle("hidden", hasAnalysis);
    if (chartCard) chartCard.classList.toggle("hidden", !hasAnalysis);
    if (scoreBreakdownCard) scoreBreakdownCard.classList.toggle("hidden", !hasAnalysis);
    if (insightsSection) insightsSection.classList.toggle("hidden", !hasAnalysis);
}

function loadCurrentUserAnalysis() {
    try {
        const currentUser = getCurrentUserName();
        if (!currentUser) return null;
        const hasUploaded = localStorage.getItem(getResumeUploadedKey(currentUser)) === "1";
        if (!hasUploaded) return null;
        const raw = localStorage.getItem(getAnalysisStorageKey(currentUser));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
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

function bindInsightToggle() {
    const toggleButton = document.getElementById("insightsToggle");
    const panels = document.querySelectorAll(".tab-panel[data-panel]");
    if (!toggleButton || !panels.length) return;

    syncInsightsToggleLabel();

    toggleButton.addEventListener("click", () => {
        const current = getActiveInsightsPanel();
        const next = current === "jobs" ? "skills" : "jobs";
        switchInsightsTab(next);
    });
}

function switchInsightsTab(target) {
    const panels = document.querySelectorAll(".tab-panel[data-panel]");
    if (!panels.length) return;

    panels.forEach((panel) => {
        const isActive = panel.getAttribute("data-panel") === target;
        panel.classList.toggle("active", isActive);
    });

    syncInsightsToggleLabel();
}

function getActiveInsightsPanel() {
    const activePanel = document.querySelector(".tab-panel.active[data-panel]");
    return activePanel?.getAttribute("data-panel") || "jobs";
}

function syncInsightsToggleLabel() {
    const toggleButton = document.getElementById("insightsToggle");
    if (!toggleButton) return;
    const activePanel = getActiveInsightsPanel();
    toggleButton.textContent = activePanel === "jobs" ? "Skill Gaps" : "Top Jobs";
}

function renderJobs(recommendations) {
    const jobsContainer = document.getElementById("jobsContainer");
    if (!jobsContainer) return;

    jobsContainer.innerHTML = "";
    if (!recommendations.length) {
        jobsContainer.innerHTML = `
            <div class="card activity-item">
                <div>
                    <p class="activity-title">No job matches yet</p>
                    <p class="text-muted">Upload and analyze your resume to see recommendations.</p>
                </div>
            </div>
        `;
        return;
    }

    recommendations.forEach((job) => {
        const card = document.createElement("div");
        card.className = "card activity-item";
        card.innerHTML = `
            <div>
                <p class="activity-title">${escapeHtml(job.career_title || "Career Match")}</p>
                <p class="text-muted">Match: ${formatPercent(job.final_score)}%</p>
            </div>
            <span class="badge">AI</span>
        `;
        jobsContainer.appendChild(card);
    });
}

function renderSkillGaps(recommendations) {
    const skillsContainer = document.getElementById("skillsContainer");
    if (!skillsContainer) return;

    skillsContainer.innerHTML = "";
    const rankedSkills = aggregateMissingSkills(recommendations);

    if (!rankedSkills.length) {
        skillsContainer.innerHTML = `
            <div class="card activity-item">
                <div>
                    <p class="activity-title">No skill gaps found</p>
                    <p class="text-muted">Looks good so far. Run resume analysis after updates.</p>
                </div>
            </div>
        `;
        return;
    }

    rankedSkills.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card activity-item";
        card.innerHTML = `
            <div>
                <p class="activity-title">${escapeHtml(item.skill)}</p>
                <p class="text-muted">Missing in ${item.count} recommendation(s)</p>
            </div>
            <span class="badge">${item.count}x</span>
        `;
        skillsContainer.appendChild(card);
    });
}

function aggregateMissingSkills(recommendations) {
    const counts = {};
    recommendations.forEach((job) => {
        const missing = Array.isArray(job.missing_skills) ? job.missing_skills : [];
        missing.forEach((skill) => {
            const key = String(skill || "").trim();
            if (!key) return;
            counts[key] = (counts[key] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

function countTechnicalSkills(technicalSkills) {
    if (!technicalSkills || typeof technicalSkills !== "object") return 0;
    let count = 0;
    Object.values(technicalSkills).forEach((group) => {
        if (Array.isArray(group)) count += group.length;
    });
    return count;
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = String(value);
}

function formatPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    return numeric % 1 === 0 ? String(numeric) : numeric.toFixed(2);
}

function formatWeight(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    return numeric.toFixed(2);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createSkillChart(score) {
    const canvas = document.getElementById("skillChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
            datasets: [
                {
                    data: [Math.max(score - 20, 10), Math.max(score - 12, 20), Math.max(score - 5, 30), score],
                    borderColor: "#4ea1e8",
                    backgroundColor: "transparent",
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 2.5,
                    pointHoverRadius: 3,
                    pointBackgroundColor: "#6fb3ea",
                    pointBorderWidth: 0,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    displayColors: false,
                    backgroundColor: "#0f2134",
                    borderColor: "#2a3f56",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: "rgba(156,178,199,0.14)",
                        tickLength: 0
                    },
                    ticks: {
                        color: "#9cb2c7"
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: "rgba(156,178,199,0.14)"
                    },
                    ticks: {
                        stepSize: 20,
                        color: "#9cb2c7"
                    }
                }
            }
        }
    });
}
