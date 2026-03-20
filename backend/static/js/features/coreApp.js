import { enforceAuthAccess, resolveAuthState } from "../core/authState.js";
import { clearAuthSession, getAuthProfile } from "../core/storage.js";
import { registerLegacyUiBridge, showToast } from "../core/ui.js";

const THEME_STORAGE_KEY = "pv-theme";

export function initCoreApp() {
    registerLegacyUiBridge();
    if (enforceAuthAccess()) return;

    bindThemeToggle();
    bindFaq();
    applyUserProfile();
    normalizeInternalLinksForStaticMode();
    const authState = setupAuthNav();
    setupLandingCtas(authState);
    bindWaitlistForm();
}

function bindThemeToggle() {
    const savedTheme = getStoredTheme();
    applyTheme(savedTheme);
}

function getStoredTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" ? "dark" : "light";
}

function getActiveTheme() {
    if (document.body.classList.contains("dark-mode")) return "dark";
    const currentTheme = document.documentElement.getAttribute("data-theme");
    return currentTheme === "dark" ? "dark" : "light";
}

function applyTheme(themeName) {
    const normalizedTheme = themeName === "dark" ? "dark" : "light";
    document.body.classList.toggle("dark-mode", normalizedTheme === "dark");
    document.documentElement.setAttribute("data-theme", normalizedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
}

function setTheme(themeName) {
    const nextTheme = themeName === "dark" ? "dark" : "light";
    const currentTheme = getActiveTheme();
    if (nextTheme === currentTheme) return false;

    applyTheme(nextTheme);
    showToast("Theme updated", nextTheme === "dark" ? "Dark mode active" : "Light mode active", "success");
    return true;
}

function toggleTheme() {
    const currentTheme = getActiveTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    return setTheme(nextTheme);
}

function bindFaq() {
    document.querySelectorAll(".faq-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const item = button.closest(".faq-item");
            if (!item) return;
            item.classList.toggle("open");
        });
    });
}

function applyUserProfile() {
    const profile = getAuthProfile();
    const displayName = profile.fullName || profile.username;
    if (!displayName) return;

    document.querySelectorAll("[data-user-name]").forEach((node) => {
        node.textContent = displayName;
    });

    const initials = buildInitials(displayName);
    document.querySelectorAll("[data-user-initials]").forEach((node) => {
        node.textContent = initials;
    });
}

function buildInitials(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return "PV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeInternalLinksForStaticMode() {
    const path = window.location.pathname;
    if (!path.includes("/templates/")) return;

    const routeMap = {
        "/": "index.html",
        "/dashboard": "dashboard.html",
        "/recommendations": "recommendations.html",
        "/resume": "resume.html",
        "/profile": "profile.html",
        "/chatbot": "chatbot.html",
        "/login": "login.html",
        "/register": "register.html"
    };

    document.querySelectorAll('a[href^="/"]').forEach((link) => {
        const rawHref = (link.getAttribute("href") || "").replace(/\/$/, "");
        const targetFile = routeMap[rawHref];
        if (!targetFile) return;
        link.setAttribute("href", `/templates/${targetFile}`);
    });
}

function bindWaitlistForm() {
    const form = document.getElementById("waitlistForm");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = document.getElementById("waitlistName")?.value.trim();
        const email = document.getElementById("waitlistEmail")?.value.trim();
        if (!name || !email) return;
        showToast("Waitlist joined", "We will contact you soon.", "success");
        form.reset();
    });
}

function setupAuthNav() {
    const authState = resolveAuthState();
    const { isAuthenticated, username } = authState;
    const dropdownHolder = document.querySelector(".auth-dropdown");
    const toggle = document.getElementById("authToggle");
    const menu = document.getElementById("authMenu");
    if (!toggle || !menu || !dropdownHolder) return authState;

    const loginItem = menu.querySelector('[data-auth-item="login"]');
    const signupItem = menu.querySelector('[data-auth-item="signup"]');
    const profileItem = menu.querySelector('[data-auth-item="profile"]');
    const logoutItem = document.querySelector('[data-auth-item="logout"]');
    const dashboardItem = document.querySelector('[data-auth-item="dashboard"]');
    const themeToggleButton = document.querySelector("[data-theme-toggle]");
    if (!themeToggleButton) return authState;

    const setMenuOpen = (open) => {
        dropdownHolder.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        menu.setAttribute("aria-hidden", open ? "false" : "true");
    };

    const syncThemeToggleButton = () => {
        const activeTheme = getActiveTheme();
        const isDark = activeTheme === "dark";
        themeToggleButton.textContent = isDark ? "Switch to Light" : "Switch to Dark";
        themeToggleButton.setAttribute("data-theme-state", isDark ? "dark" : "light");
        themeToggleButton.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
        themeToggleButton.classList.toggle("is-dark-state", isDark);
        themeToggleButton.classList.toggle("is-light-state", !isDark);
    };

    if (isAuthenticated) {
        toggle.textContent = username || "Account";
        loginItem?.classList.add("hidden");
        signupItem?.classList.add("hidden");
        profileItem?.classList.remove("hidden");
        logoutItem?.classList.remove("hidden");
        dashboardItem?.classList.remove("hidden");
    } else {
        toggle.textContent = "Account";
        loginItem?.classList.remove("hidden");
        signupItem?.classList.remove("hidden");
        profileItem?.classList.add("hidden");
        logoutItem?.classList.add("hidden");
        dashboardItem?.classList.add("hidden");
    }

    syncThemeToggleButton();

    toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        setMenuOpen(!isOpen);
        if (!isOpen) syncThemeToggleButton();
    });

    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && event.target !== toggle) {
            setMenuOpen(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setMenuOpen(false);
    });

    if (logoutItem) {
        logoutItem.addEventListener("click", (event) => {
            event.preventDefault();
            clearAuthSession();
            showToast("Logged out", "You have been signed out.", "success");
            setTimeout(() => {
                window.location.href = "/login/";
            }, 250);
        });
    }

    themeToggleButton.addEventListener("click", () => {
        toggleTheme();
        syncThemeToggleButton();
    });

    return authState;
}

function setupLandingCtas(authState) {
    if (!authState) return;
    const startButtons = document.querySelectorAll("[data-cta-start]");
    const dashboardButtons = document.querySelectorAll("[data-cta-dashboard]");

    if (authState.isAuthenticated) {
        startButtons.forEach((button) => {
            button.classList.add("hidden");
        });
        dashboardButtons.forEach((button) => {
            button.setAttribute("href", "/dashboard/");
        });
        return;
    }

    startButtons.forEach((button) => {
        button.classList.remove("hidden");
        button.setAttribute("href", "/login/");
    });
    dashboardButtons.forEach((button) => {
        button.setAttribute("href", "/login/");
    });
}
