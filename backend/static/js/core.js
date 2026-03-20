document.addEventListener("DOMContentLoaded", () => {
    import("./features/coreApp.js")
        .then(({ initCoreApp }) => initCoreApp())
        .catch((error) => {
            console.error("Failed to initialize core app:", error);
        });
});
