document.addEventListener("DOMContentLoaded", () => {

    const dropZone = document.getElementById("dropZone");
    const input = document.getElementById("resumeUpload");
    const preview = document.getElementById("filePreview");
    const nameNode = document.getElementById("fileName");
    const sizeNode = document.getElementById("fileSize");
    const removeBtn = document.getElementById("removeFile");
    const progressBar = document.getElementById("uploadBar");
    const errorBox = document.getElementById("resumeError");
    const aiAnalysisText = document.getElementById("aiAnalysisText");
    const scoreMetricsText = document.getElementById("scoreMetricsText");
    const improvementsText = document.getElementById("improvementsText");
    const goDashboardBtn = document.getElementById("goDashboardBtn");

    if (!dropZone || !input || !preview || !nameNode || !sizeNode || !removeBtn || !progressBar || !errorBox) {
        console.error("Resume upload elements missing.");
        return;
    }

    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    const maxFileSize = 5 * 1024 * 1024;
    let selectedFile = null;

    resetUploadState();
    toggleDashboardButton(false);
    hydrateAnalysisCards();

    input.addEventListener("change", () => {
        if (input.files && input.files.length > 0) {
            handleFile(input.files[0]);
        }
    });

    removeBtn.addEventListener("click", () => {
        resetUploadState();
    });

    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults);
    });

    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add("is-dragging"));
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove("is-dragging"));
    });

    dropZone.addEventListener("drop", (event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    });

    function preventDefaults(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    function handleFile(file) {

        errorBox.classList.add("hidden");

        if (!allowedTypes.includes(file.type)) {
            showError("Only PDF and DOCX files are allowed.");
            return;
        }

        if (file.size > maxFileSize) {
            showError("File size must be less than 5MB.");
            return;
        }

        selectedFile = file;

        nameNode.textContent = file.name;
        sizeNode.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";

        preview.classList.remove("hidden");
        progressBar.style.width = "0%";

        uploadResume();
    }

    async function uploadResume() {

        if (!selectedFile) return;
        const currentUser = getCurrentUserName();
        if (!currentUser) {
            showError("Please sign in before uploading a resume.");
            return;
        }

        const formData = new FormData();
        formData.append("resume", selectedFile);
        const username = (localStorage.getItem("pv-user-name") || "").trim();
        const fullName = (localStorage.getItem("pv-user-fullname") || "").trim();
        const email = (localStorage.getItem("pv-user-email") || "").trim();
        if (username) formData.append("username", username);
        if (fullName) formData.append("full_name", fullName);
        if (email) formData.append("email", email);

        try {

            progressBar.style.width = "15%";

            const response = await fetch("/analyze/", {
                method: "POST",
                body: formData
            });

            progressBar.style.width = "60%";

            if (!response.ok) {
                let serverMessage = "Upload failed. Please try again.";
                try {
                    const errorPayload = await response.json();
                    serverMessage = errorPayload.error || serverMessage;
                } catch (parseError) {
                    // Keep fallback message.
                }
                throw new Error(serverMessage);
            }

            const data = await response.json();

            progressBar.style.width = "100%";

            if (currentUser) {
                localStorage.setItem(getAnalysisStorageKey(currentUser), JSON.stringify(data));
                localStorage.setItem(getResumeUploadedKey(currentUser), "1");
            }
            updateAnalysisCards(data);
            toggleDashboardButton(true);
            window.pathVeraUI?.showToast("Analysis ready", "Resume insights updated below.", "success");

        } catch (error) {
            console.error(error);
            showError(error.message || "Upload failed. Please try again.");
            resetUploadState();
        }
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.classList.remove("hidden");
    }

    function resetUploadState() {
        input.value = "";
        selectedFile = null;
        preview.classList.add("hidden");
        errorBox.classList.add("hidden");
        errorBox.textContent = "";
        progressBar.style.width = "0%";
        nameNode.textContent = "resume.pdf";
        sizeNode.textContent = "0 MB";
    }

    function hydrateAnalysisCards() {
        try {
            const currentUser = getCurrentUserName();
            if (!currentUser) return;
            const hasUploaded = localStorage.getItem(getResumeUploadedKey(currentUser)) === "1";
            if (!hasUploaded) return;
            const raw = localStorage.getItem(getAnalysisStorageKey(currentUser));
            if (!raw) return;
            const data = JSON.parse(raw);
            updateAnalysisCards(data);
            toggleDashboardButton(true);
        } catch (error) {
            // Ignore invalid local data and keep default card text.
        }
    }

    function updateAnalysisCards(data) {
        if (!aiAnalysisText || !scoreMetricsText || !improvementsText) return;

        const parsed = data?.parsed_resume || {};
        const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
        const topRecommendation = recommendations[0] || {};

        const degree = parsed.degree || "Degree not detected";
        const domain = parsed.domain || "domain unknown";
        const years = Number(parsed.experience_years || 0);

        const topScore = Number(topRecommendation.final_score || 0);
        const jobCount = recommendations.length;
        const jobTitle = topRecommendation.career_title || "career match";
        const missingSkills = Array.isArray(topRecommendation.missing_skills) ? topRecommendation.missing_skills : [];

        aiAnalysisText.textContent = `Detected ${degree} background in ${domain}. Experience: ${years} year(s).`;
        scoreMetricsText.textContent = `Top match: ${jobTitle} (${formatPercent(topScore)}%). Total recommendations: ${jobCount}.`;
        improvementsText.textContent = missingSkills.length
            ? `Focus skills: ${missingSkills.slice(0, 3).join(", ")}.`
            : "No major skill gaps detected in top match.";
    }

    function formatPercent(value) {
        if (!Number.isFinite(value)) return "0";
        const rounded = Math.round(value * 100) / 100;
        return rounded % 1 === 0 ? String(rounded.toFixed(0)) : rounded.toFixed(2);
    }

    function toggleDashboardButton(visible) {
        if (!goDashboardBtn) return;
        goDashboardBtn.classList.toggle("hidden", !visible);
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

});
