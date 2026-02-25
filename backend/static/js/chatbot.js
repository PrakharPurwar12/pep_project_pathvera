document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("chatForm");
    const input = document.getElementById("userInput");
    const messages = document.getElementById("chatMessages");
    const clearButton = document.getElementById("clearChat");
    const storageKey = "pv-chat-history-v2";
    localStorage.removeItem("pv-chat-history");

    if (!form || !input || !messages || !clearButton) {
        return;
    }

    // Keep current session chat only; do not restore old messages on refresh.

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const text = input.value.trim();
        if (!text) {
            return;
        }

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
        window.pathVeraUI?.showToast("Chat cleared", "History removed from browser.", "success");
    });

    // Clear chat history whenever page is reloaded or tab is closed.
    window.addEventListener("beforeunload", () => {
        localStorage.removeItem(storageKey);
    });

    function appendMessage(text, role, save) {
        const item = document.createElement("div");
        item.className = `message ${role}`;
        const content = document.createElement("span");
        content.className = "message-text";
        content.textContent = text;
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
        // Replace this endpoint with your Django + ML chat endpoint.
        try {
            const response = await fetch("/api/chat/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: query, language: "en" })
            });
            if (response.ok) {
                const data = await response.json();
                if (data && typeof data.reply === "string" && data.reply.trim()) {
                    return data.reply;
                }
            }
        } catch (error) {
            // Fallback is used when backend is not connected yet.
        }

        const text = query.toLowerCase();
        if (text.includes("resume")) {
            return "Upload your resume and I can help improve keyword matching and impact-focused bullet points.";
        }
        if (text.includes("interview")) {
            return "Prepare three STAR stories for interviews: leadership, problem solving, and ownership.";
        }
        if (text.includes("job") || text.includes("role")) {
            return "Check top matches on the recommendations page and apply first to high-match roles.";
        }
        return "I am ready. Share your target role and current skill level to get a focused plan.";
    }

    function persistHistory() {
        const list = Array.from(messages.querySelectorAll(".message")).map((node) => ({
            role: node.classList.contains("user") ? "user" : "bot",
            text: node.querySelector(".message-text")?.textContent || "",
            time: node.querySelector(".message-meta")?.textContent || ""
        }));
        localStorage.setItem(storageKey, JSON.stringify(list));
    }

    // restoreHistory removed intentionally so reload always starts fresh.
});
