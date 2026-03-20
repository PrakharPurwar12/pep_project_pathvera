document.addEventListener("DOMContentLoaded", () => {
    import("./features/recommendations.js")
        .then(({ initRecommendations }) => initRecommendations())
        .catch((error) => {
            console.error("Failed to initialize recommendations feature:", error);
        });
});
