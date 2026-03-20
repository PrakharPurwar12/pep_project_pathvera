document.addEventListener("DOMContentLoaded", () => {
    import("./features/chatbot.js")
        .then(({ initChatbot }) => initChatbot())
        .catch((error) => {
            console.error("Failed to initialize chatbot feature. Falling back to legacy init:", error);
            initChatbotLegacy();
        });
});

function initChatbotLegacy() {
    const form = document.getElementById("chatForm");
    const input = document.getElementById("userInput");
    const messages = document.getElementById("chatMessages");
    const clearButton = document.getElementById("clearChat");
    const storageKey = "pv-chat-history-v2";

    localStorage.removeItem("pv-chat-history");
    if (!form || !input || !messages || !clearButton) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        appendMessage(text, "user", true);
        input.value = "";
        showTyping();

        const reply = await askAssistant(text);
        removeTyping();
        appendMessage(reply, "bot", true);
    });

    clearButton.addEventListener("click", () => {
        localStorage.removeItem(storageKey);
        messages.innerHTML = "";
        if (window.pathVeraUI?.showToast) {
            window.pathVeraUI.showToast("Chat cleared", "History removed from browser.", "success");
        }
    });

    window.addEventListener("beforeunload", () => {
        localStorage.removeItem(storageKey);
    });

    function appendMessage(text, role, save) {
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
        if (save) persistHistory();
    }

    function showTyping() {
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
            const response = await fetch("/api/chat/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: query,
                    resume_context: resumeContext
                })
            });
            const data = await response.json().catch(() => null);
            if (data && typeof data.reply === "string" && data.reply.trim()) return data.reply;
        } catch (e) {
            return fallbackReply;
        }
        return fallbackReply;
    }

    function getResumeContextForChat() {
        const sources = [];

        try {
            const legacy = JSON.parse(localStorage.getItem("pv_resume_analysis") || "{}");
            if (legacy && typeof legacy === "object") sources.push(legacy);
        } catch (e) {
            // Ignore invalid local data.
        }

        try {
            const username = (localStorage.getItem("pv-user-name") || "").trim().toLowerCase();
            if (username) {
                const scoped = JSON.parse(localStorage.getItem(`analysisData:${username}`) || "{}");
                if (scoped && typeof scoped === "object") sources.push(scoped);
            }
        } catch (e) {
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

    function persistHistory() {
        const list = Array.from(messages.querySelectorAll(".message")).map((node) => ({
            role: node.classList.contains("user") ? "user" : "bot",
            text: node.querySelector(".message-text")?.textContent || "",
            time: node.querySelector(".message-meta")?.textContent || ""
        }));
        localStorage.setItem(storageKey, JSON.stringify(list));
    }
}
