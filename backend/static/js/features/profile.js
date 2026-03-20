import {
    getAuthProfile,
    getCurrentUserName,
    getLegacyResumeAnalysis,
    readAnalysisForUser,
    setAuthProfile
} from "../core/storage.js";
import { apiRequest } from "../api/apiClient.js";

const PROFILE_PENDING_SYNC_KEY = "pv-profile-pending-sync";

export function initProfile() {
    hydrateDynamicProfile();
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
    const careerMatches = recommendations.map((item) => cleanText(item?.career_title)).filter(Boolean);
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
    setText("aiSummaryText", buildSummary(skills, careerMatches, skillGaps));

    const now = new Date();
    setText("latestAnalysisText", `Latest analysis: ${formatDateTime(now)}`);
    renderTimeline("activityTimelineList", [
        { action: "Resume analyzed and profile insights updated.", timeLabel: formatDateTime(now) }
    ]);
}

function initProfileEditor() {
    const locationInput = document.getElementById("profileLocationInput");
    const phoneInput = document.getElementById("profilePhoneInput");
    const bioInput = document.getElementById("profileBioInput");
    const saveState = document.getElementById("profileSaveState");

    if (!locationInput || !phoneInput || !bioInput || !saveState) return;

    let debounceHandle = null;
    let lastSaved = {
        location: "",
        phone_number: "",
        bio: ""
    };

    const setSaveState = (text, tone = "ok") => {
        saveState.textContent = text;
        saveState.classList.remove("save-ok", "save-bad");
        saveState.classList.add(tone === "bad" ? "save-bad" : "save-ok");
    };

    const readPayload = () => ({
        location: cleanText(locationInput.value),
        phone_number: cleanText(phoneInput.value),
        bio: cleanText(bioInput.value)
    });

    const hydrateFromLocal = () => {
        const profile = getAuthProfile();
        locationInput.value = cleanText(profile.location);
        bioInput.value = cleanText(profile.bio);
        const pending = readPendingSync();
        if (pending) {
            locationInput.value = pending.location;
            phoneInput.value = pending.phone_number;
            bioInput.value = pending.bio;
        }
        lastSaved = readPayload();
        setSaveState("Local autosave ready");
    };

    const saveLocal = (payload) => {
        setText("profileLocationValue", payload.location || "Not available");
        setAuthProfile({
            ...getAuthProfile(),
            location: payload.location,
            bio: payload.bio
        });
        lastSaved = payload;
    };

    const saveAndSync = async () => {
        const payload = readPayload();
        if (
            payload.location === lastSaved.location
            && payload.phone_number === lastSaved.phone_number
            && payload.bio === lastSaved.bio
        ) {
            return;
        }

        saveLocal(payload);
        writePendingSync(payload);
        setSaveState("Saved locally");

        if (!isServerAuthenticated()) return;

        try {
            await apiRequest("/api/profiles/me/", {
                method: "PATCH",
                body: JSON.stringify(payload)
            });
            clearPendingSync();
            setSaveState("Saved to server");
        } catch (error) {
            setSaveState("Saved locally. Server sync pending.");
        }
    };

    const scheduleSave = () => {
        if (debounceHandle) window.clearTimeout(debounceHandle);
        debounceHandle = window.setTimeout(saveAndSync, 500);
    };

    locationInput.addEventListener("input", scheduleSave);
    phoneInput.addEventListener("input", scheduleSave);
    bioInput.addEventListener("input", scheduleSave);

    [locationInput, phoneInput, bioInput].forEach((input) => {
        input.addEventListener("blur", saveAndSync);
    });

    hydrateFromLocal();
    hydrateFromServer(locationInput, phoneInput, bioInput, setSaveState, saveLocal);
    tryFlushPendingSync(setSaveState);

    window.addEventListener("online", () => tryFlushPendingSync(setSaveState));
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            tryFlushPendingSync(setSaveState);
        }
    });
}

async function hydrateFromServer(locationInput, phoneInput, bioInput, setSaveState, saveLocal) {
    if (!isServerAuthenticated()) return;
    try {
        const data = await apiRequest("/api/profiles/me/", { method: "GET" });
        const payload = {
            location: cleanText(data?.location),
            phone_number: cleanText(data?.phone_number),
            bio: cleanText(data?.bio)
        };
        locationInput.value = payload.location;
        phoneInput.value = payload.phone_number;
        bioInput.value = payload.bio;
        saveLocal(payload);
        clearPendingSync();
        setSaveState("Profile synced");
    } catch (error) {
        setSaveState("Local autosave ready");
    }
}

async function tryFlushPendingSync(setSaveState) {
    if (!isServerAuthenticated()) return;
    const pending = readPendingSync();
    if (!pending) return;
    try {
        await apiRequest("/api/profiles/me/", {
            method: "PATCH",
            body: JSON.stringify(pending)
        });
        clearPendingSync();
        setSaveState("Pending changes synced");
    } catch (error) {
        setSaveState("Saved locally. Server sync pending.");
    }
}

function isServerAuthenticated() {
    const navNode = document.querySelector("nav[data-server-auth]");
    return (navNode?.getAttribute("data-server-auth") || "").trim() === "true";
}

function readPendingSync() {
    try {
        const raw = localStorage.getItem(PROFILE_PENDING_SYNC_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return {
            location: cleanText(parsed.location),
            phone_number: cleanText(parsed.phone_number),
            bio: cleanText(parsed.bio)
        };
    } catch (error) {
        return null;
    }
}

function writePendingSync(payload) {
    localStorage.setItem(PROFILE_PENDING_SYNC_KEY, JSON.stringify(payload));
}

function clearPendingSync() {
    localStorage.removeItem(PROFILE_PENDING_SYNC_KEY);
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
