document.addEventListener("DOMContentLoaded", () => {
    import("./features/dashboard.js")
        .then(({ initDashboard }) => initDashboard())
        .catch((error) => {
            console.error("Failed to initialize dashboard feature:", error);
        });
});
