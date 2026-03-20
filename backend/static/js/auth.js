document.addEventListener("DOMContentLoaded", () => {
    import("./features/auth.js")
        .then(({ initAuth }) => initAuth())
        .catch((error) => {
            console.error("Failed to initialize auth feature:", error);
        });
});
