import {
    getAuthProfile,
    getCurrentUserName,
    getLegacyResumeAnalysis,
    readAnalysisForUser,
    setAuthProfile
} from "../core/storage.js";
import { apiRequest } from "../api/apiClient.js";

export function initProfile() {
    hydrateDynamicProfile();
    hydrateFromBackend();
    initProfileEditor();
}

function hydrateDynamicProfile() {
    const authProfile = getAuthProfile();
    const currentUser = getCurrentUserName();

    const fullName = cleanText(authProfile.fullName);
    const username = cleanText(authProfile.username || currentUser);
    const email = cleanText(authProfile.email);
    const location = cleanText(authProfile.location);

    setText("profileFullNameValue", fullName || username || "Not available");
    setText("profileUsernameValue", username || "Not available");
    setText("profileEmailValue", email || "Not available");
    setText("profileLocationValue", location || "Not available");

    const analysis = resolveAnalysisData(currentUser);
    if (!analysis) return;

    const parsed = asObject(analysis.parsed_resume);
    const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];

    const skills = normalizeSkills(parsed.technical_skills);
    const careerMatches = recommendations
        .map((item) => cleanText(item?.career_title))
        .filter(Boolean);
    const skillGaps = dedupe(
        recommendations.flatMap((item) => (
            Array.isArray(item?.missing_skills)
                ? item.missing_skills.map((skill) => cleanText(skill)).filter(Boolean)
                : []
        ))
    );

    const topRecommendation = recommendations[0] || {};
    const resumeScore = normalizeScore(topRecommendation.final_score);

    setText("skillsCountTag", `${skills.length} skills detected`);
    setText("matchesCountTag", `${careerMatches.length} career matches`);
    setText("gapsCountTag", `${skillGaps.length} skill gaps`);

    renderActivityList("careerMatchesList", careerMatches, "No career matches available.");
    renderActivityList("skillGapsList", skillGaps, "No skill gaps detected.");
    renderSkillTags("detectedSkillsTags", skills, "No skills detected yet.");

    const strengthFill = document.getElementById("resumeStrengthFill");
    if (strengthFill) {
        strengthFill.style.width = `${resumeScore}%`;
        strengthFill.classList.toggle("low", resumeScore < 50);
    }
    setText("resumeStrengthText", `${resumeScore}% Resume Strength`);

    const aiSummary = buildSummary(skills, careerMatches, skillGaps);
    setText("aiSummaryText", aiSummary);

    const timestamp = new Date();
    setText("latestAnalysisText", `Latest analysis: ${formatDateTime(timestamp)}`);
    renderTimeline("activityTimelineList", [
        {
            action: "Resume analyzed and profile insights updated.",
            timeLabel: formatDateTime(timestamp)
        },
        {
            action: "Profile synced from your current session.",
            timeLabel: formatDateTime(timestamp)
        }
    ]);
}

async function hydrateFromBackend() {
    try {
        const data = await apiRequest("/api/profile/summary/", { method: "GET" });
        const user = asObject(data?.user);
        const skills = Array.isArray(data?.skills) ? data.skills.map(cleanText).filter(Boolean) : [];
        const careerMatches = Array.isArray(data?.career_matches) ? data.career_matches.map(cleanText).filter(Boolean) : [];
        const skillGaps = Array.isArray(data?.skill_gaps) ? data.skill_gaps.map(cleanText).filter(Boolean) : [];
        const resumeScore = normalizeScore(data?.resume_score);

        setText("profileFullNameValue", cleanText(user.full_name) || cleanText(user.username) || "Not available");
        setText("profileUsernameValue", cleanText(user.username) || "Not available");
        setText("profileEmailValue", cleanText(user.email) || "Not available");
        setText("profileLocationValue", cleanText(data?.location) || cleanText(user.location) || "Not available");
        syncEditorFields({
            location: cleanText(data?.location) || cleanText(user.location),
            phone_number: cleanText(data?.phone_number),
            bio: cleanText(data?.bio)
        });
        setAuthProfile({
            username: cleanText(user.username),
            fullName: cleanText(user.full_name) || cleanText(user.username),
            email: cleanText(user.email),
            location: cleanText(data?.location) || cleanText(user.location),
            bio: cleanText(data?.bio)
        });

        setText("skillsCountTag", `${skills.length} skills detected`);
        setText("matchesCountTag", `${careerMatches.length} career matches`);
        setText("gapsCountTag", `${skillGaps.length} skill gaps`);
        renderActivityList("careerMatchesList", careerMatches, "No career matches available.");
        renderActivityList("skillGapsList", skillGaps, "No skill gaps detected.");
        renderSkillTags("detectedSkillsTags", skills, "No skills detected yet.");

        const strengthFill = document.getElementById("resumeStrengthFill");
        if (strengthFill) {
            strengthFill.style.width = `${resumeScore}%`;
            strengthFill.classList.toggle("low", resumeScore < 50);
        }
        setText("resumeStrengthText", `${resumeScore}% Resume Strength`);
        setText("aiSummaryText", cleanText(data?.ai_summary) || buildSummary(skills, careerMatches, skillGaps));

        if (data?.latest_analysis_at) {
            const parsedDate = new Date(data.latest_analysis_at);
            setText("latestAnalysisText", `Latest analysis: ${formatDateTime(parsedDate)}`);
        }

        const backendActivities = Array.isArray(data?.activities)
            ? data.activities.map((activity) => ({
                action: cleanText(activity?.action) || "Activity update",
                timeLabel: activity?.created_at ? formatDateTime(new Date(activity.created_at)) : ""
            }))
            : [];
        if (backendActivities.length) {
            renderTimeline("activityTimelineList", backendActivities);
        }
    } catch (error) {
        // Local/session-based hydrate above already populated fallback state.
    }
}

function initProfileEditor() {
    const form = document.getElementById("profileEditorForm");
    const locationInput = document.getElementById("profileLocationInput");
    const phoneInput = document.getElementById("profilePhoneInput");
    const bioInput = document.getElementById("profileBioInput");
    const saveState = document.getElementById("profileSaveState");

    if (!form || !locationInput || !phoneInput || !bioInput || !saveState) return;

    let initialized = false;
    let lastSavedPayload = {
        location: "",
        phone_number: "",
        bio: ""
    };
    let debounceHandle = null;

    const syncFromLocal = () => {
        const profile = getAuthProfile();
        if (!profile) return;
        if (!locationInput.value.trim()) locationInput.value = cleanText(profile.location);
        if (!bioInput.value.trim()) bioInput.value = cleanText(profile.bio);
    };

    const applySaveState = (label, tone = "muted") => {
        saveState.textContent = label;
        saveState.classList.remove("save-ok", "save-bad");
        if (tone === "ok") saveState.classList.add("save-ok");
        if (tone === "bad") saveState.classList.add("save-bad");
    };

    const readPayload = () => ({
        location: cleanText(locationInput.value),
        phone_number: cleanText(phoneInput.value),
        bio: cleanText(bioInput.value)
    });

    const hasChanges = (payload) => (
        payload.location !== lastSavedPayload.location
        || payload.phone_number !== lastSavedPayload.phone_number
        || payload.bio !== lastSavedPayload.bio
    );

    const saveNow = async () => {
        const payload = readPayload();
        if (!hasChanges(payload)) return;

        applySaveState("Saving...");
        try {
            const updated = await apiRequest("/api/profiles/me/", {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            lastSavedPayload = {
                location: cleanText(updated?.location || payload.location),
                phone_number: cleanText(updated?.phone_number || payload.phone_number),
                bio: cleanText(updated?.bio || payload.bio)
            };

            setText("profileLocationValue", lastSavedPayload.location || "Not available");
            setAuthProfile({
                ...getAuthProfile(),
                location: lastSavedPayload.location,
                bio: lastSavedPayload.bio
            });
            applySaveState("Saved just now", "ok");
        } catch (error) {
            // Fallback: keep profile editable even if backend session expires.
            lastSavedPayload = payload;
            setText("profileLocationValue", payload.location || "Not available");
            setAuthProfile({
                ...getAuthProfile(),
                location: payload.location,
                bio: payload.bio
            });
            if (error?.status === 401 || error?.status === 403) {
                applySaveState("Saved locally (login again to sync server)", "bad");
                return;
            }
            applySaveState(error?.message || "Save failed. Try again.", "bad");
        }
    };

    const scheduleSave = () => {
        if (!initialized) return;
        if (debounceHandle) window.clearTimeout(debounceHandle);
        debounceHandle = window.setTimeout(() => {
            saveNow();
        }, 650);
    };

    const initFromBackend = async () => {
        try {
            const response = await apiRequest("/api/profiles/me/", { method: "GET" });
            const payload = {
                location: cleanText(response?.location),
                phone_number: cleanText(response?.phone_number),
                bio: cleanText(response?.bio)
            };
            locationInput.value = payload.location;
            phoneInput.value = payload.phone_number;
            bioInput.value = payload.bio;
            lastSavedPayload = payload;
            applySaveState("Profile loaded");
        } catch (error) {
            syncFromLocal();
            lastSavedPayload = readPayload();
            applySaveState("Autosave unavailable right now", "bad");
        } finally {
            initialized = true;
        }
    };

    [locationInput, phoneInput, bioInput].forEach((input) => {
        input.addEventListener("input", scheduleSave);
        input.addEventListener("change", scheduleSave);
        input.addEventListener("blur", saveNow);
    });

    initFromBackend();
}

function syncEditorFields(profile) {
    const locationInput = document.getElementById("profileLocationInput");
    const phoneInput = document.getElementById("profilePhoneInput");
    const bioInput = document.getElementById("profileBioInput");
    if (locationInput && !locationInput.value.trim()) locationInput.value = cleanText(profile?.location);
    if (phoneInput && !phoneInput.value.trim()) phoneInput.value = cleanText(profile?.phone_number);
    if (bioInput && !bioInput.value.trim()) bioInput.value = cleanText(profile?.bio);
}

function resolveAnalysisData(currentUser) {
    if (currentUser) {
        const perUserAnalysis = readAnalysisForUser(currentUser);
        if (perUserAnalysis && typeof perUserAnalysis === "object") {
            return perUserAnalysis;
        }
    }

    const legacy = getLegacyResumeAnalysis();
    if (legacy && typeof legacy === "object" && Object.keys(legacy).length) {
        return legacy;
    }
    return null;
}

function asObject(value) {
    return value && typeof value === "object" ? value : {};
}

function normalizeSkills(skillsPayload) {
    if (Array.isArray(skillsPayload)) {
        return dedupe(skillsPayload.map((item) => cleanText(item)).filter(Boolean));
    }
    if (skillsPayload && typeof skillsPayload === "object") {
        const combined = [];
        Object.values(skillsPayload).forEach((group) => {
            if (Array.isArray(group)) {
                combined.push(...group.map((item) => cleanText(item)).filter(Boolean));
            } else {
                const text = cleanText(group);
                if (text) combined.push(text);
            }
        });
        return dedupe(combined);
    }
    return [];
}

function normalizeScore(rawScore) {
    const score = Number(rawScore || 0);
    if (!Number.isFinite(score)) return 0;
    if (score > 1 && score <= 100) return Math.max(0, Math.min(100, Math.round(score)));
    if (score >= 0 && score <= 1) return Math.max(0, Math.min(100, Math.round(score * 100)));
    return 0;
}

function buildSummary(skills, careerMatches, skillGaps) {
    if (!skills.length && !careerMatches.length) {
        return "Upload and analyze your resume to generate a personalized AI career summary.";
    }
    const strengths = skills.length ? skills.slice(0, 4).join(", ") : "your detected skills";
    const directions = careerMatches.length ? careerMatches.slice(0, 3).join(", ") : "roles aligned to your profile";
    const focus = skillGaps.length ? skillGaps.slice(0, 3).join(", ") : "continuous project impact";
    return `Your strengths include ${strengths}. Recommended directions: ${directions}. Focus next on ${focus}.`;
}

function renderActivityList(containerId, items, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "text-muted";
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }

    items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "activity-item";
        row.innerHTML = `<div><p class="activity-title">${escapeHtml(item)}</p></div>`;
        container.appendChild(row);
    });
}

function renderTimeline(containerId, entries) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "text-muted";
        empty.textContent = "No activity recorded yet.";
        container.appendChild(empty);
        return;
    }

    entries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "activity-item";
        row.innerHTML = `
            <div>
                <p class="activity-title">${escapeHtml(entry.action || "")}</p>
                <p class="text-muted">${escapeHtml(entry.timeLabel || "")}</p>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderSkillTags(containerId, skills, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    if (!skills.length) {
        const empty = document.createElement("span");
        empty.className = "text-muted";
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }

    skills.forEach((skill) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = skill;
        container.appendChild(tag);
    });
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = String(value || "");
}

function cleanText(value) {
    return String(value || "").trim();
}

function dedupe(items) {
    return Array.from(new Set(items));
}

function formatDateTime(date) {
    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    } catch (error) {
        return date.toLocaleString();
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}
