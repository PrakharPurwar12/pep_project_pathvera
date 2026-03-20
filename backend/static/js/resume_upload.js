document.addEventListener("DOMContentLoaded", () => {
    import("./features/resumeUpload.js")
        .then(({ initResumeUpload }) => initResumeUpload())
        .catch((error) => {
            console.error("Failed to initialize resume upload feature:", error);
        });
});
