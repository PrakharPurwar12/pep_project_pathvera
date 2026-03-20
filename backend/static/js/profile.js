document.addEventListener("DOMContentLoaded", () => {
    import("./features/profile.js")
        .then(({ initProfile }) => initProfile())
        .catch((error) => {
            console.error("Failed to initialize profile feature:", error);
        });
});
