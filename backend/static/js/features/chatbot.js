import { apiRequest } from "../api/apiClient.js";
import {
    clearDeprecatedChatHistory,
    getAnalysisStorageKey,
    getChatHistoryKey,
    getCurrentUserName,
    getLegacyResumeAnalysis
} from "../core/storage.js";
import { hideLoading, showLoading, showToast } from "../core/ui.js";

export function initChatbot() {
    const form = document.getElementById("chatForm");
    const input = document.getElementById("userInput");
    const messages = document.getElementById("chatMessages");
    const clearButton = document.getElementById("clearChat");
    const submitButton = form?.querySelector('button[type="submit"]');
    const storageKey = getChatHistoryKey();

    clearDeprecatedChatHistory();

    if (!form || !input || !messages || !clearButton) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const text = input.value.trim();
        if (!text) return;

        appendMessage(messages, text, "user", true, storageKey);
        input.value = "";
        showTyping(messages);
        showLoading(submitButton);

        const reply = await askAssistant(text);
        removeTyping();
        appendMessage(messages, reply, "bot", true, storageKey);
        hideLoading(submitButton);
    });

    clearButton.addEventListener("click", () => {
        localStorage.removeItem(storageKey);
        messages.innerHTML = "";
        showToast("Chat cleared", "History removed from browser.", "success");
    });

    window.addEventListener("beforeunload", () => {
        localStorage.removeItem(storageKey);
    });
}

function appendMessage(messages, text, role, save, storageKey) {
    const item = document.createElement("div");
    item.className = `message ${role}`;
    const content = document.createElement("span");
    content.className = "message-text";

    if (role === "bot") {
        content.classList.add("ai-message");
        if (window.marked && typeof window.marked.parse === "function") {
            content.innerHTML = window.marked.parse(String(text || ""));
        } else {
            content.textContent = String(text || "");
        }
    } else {
        content.textContent = String(text || "");
    }

    const meta = document.createElement("span");
    meta.className = "message-meta";
    meta.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    item.append(content, meta);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    if (save) persistHistory(messages, storageKey);
}

function showTyping(messages) {
    const item = document.createElement("div");
    item.id = "typingIndicator";
    item.className = "message bot";
    item.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
    document.getElementById("typingIndicator")?.remove();
}

async function askAssistant(query) {
    const fallbackReply = "AI service is temporarily unavailable. Please try again later.";
    const resumeContext = getResumeContextForChat();

    try {
        const data = await apiRequest("/api/chat/", {
            method: "POST",
            body: JSON.stringify({
                message: query,
                resume_context: resumeContext
            })
        });
        if (data && typeof data.reply === "string" && data.reply.trim()) {
            return data.reply;
        }
    } catch (error) {
        return fallbackReply;
    }

    return fallbackReply;
}

function getResumeContextForChat() {
    const sources = [];

    const legacy = getLegacyResumeAnalysis();
    if (legacy && typeof legacy === "object") sources.push(legacy);

    try {
        const username = getCurrentUserName();
        if (username) {
            const scoped = JSON.parse(localStorage.getItem(getAnalysisStorageKey(username)) || "{}");
            if (scoped && typeof scoped === "object") sources.push(scoped);
        }
    } catch (error) {
        // Ignore invalid local data.
    }

    const primary = sources.find((item) => item.parsed_resume || item.recommendations) || sources[0] || {};
    const parsed = primary.parsed_resume || {};
    const recommendations = Array.isArray(primary.recommendations) ? primary.recommendations : [];
    const skills = extractSkills(parsed, primary.skills);
    const careerMatches = recommendations
        .map((item) => String(item?.career_title || "").trim())
        .filter(Boolean)
        .slice(0, 5);
    const skillGaps = aggregateSkillGaps(recommendations);

    return {
        skills,
        career_matches: careerMatches,
        skill_gaps: skillGaps
    };
}

function extractSkills(parsedResume, fallbackSkills) {
    const set = new Set();
    const technical = parsedResume?.technical_skills;

    if (technical && typeof technical === "object") {
        Object.values(technical).forEach((group) => {
            if (Array.isArray(group)) {
                group.forEach((skill) => {
                    const value = String(skill || "").trim();
                    if (value) set.add(value);
                });
            }
        });
    }

    if (Array.isArray(fallbackSkills)) {
        fallbackSkills.forEach((skill) => {
            const value = String(skill || "").trim();
            if (value) set.add(value);
        });
    }

    return Array.from(set).slice(0, 30);
}

function aggregateSkillGaps(recommendations) {
    const counts = {};
    recommendations.forEach((item) => {
        const missing = Array.isArray(item?.missing_skills) ? item.missing_skills : [];
        missing.forEach((skill) => {
            const value = String(skill || "").trim();
            if (!value) return;
            counts[value] = (counts[value] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([skill]) => skill)
        .slice(0, 10);
}

function persistHistory(messages, storageKey) {
    const list = Array.from(messages.querySelectorAll(".message")).map((node) => ({
        role: node.classList.contains("user") ? "user" : "bot",
        text: node.querySelector(".message-text")?.textContent || "",
        time: node.querySelector(".message-meta")?.textContent || ""
    }));
    localStorage.setItem(storageKey, JSON.stringify(list));
}
