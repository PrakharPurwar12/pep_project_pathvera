import { enforceAuthAccess, resolveAuthState } from "../core/authState.js";
import { clearAuthSession, getAuthProfile } from "../core/storage.js";
import { registerLegacyUiBridge, showToast } from "../core/ui.js";

const THEME_STORAGE_KEY = "pv-theme";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function initCoreApp() {
    registerLegacyUiBridge();
    if (enforceAuthAccess()) return;

    initPageLoadState();
    bindThemeToggle();
    bindFaq();
    applyUserProfile();
    normalizeInternalLinksForStaticMode();
    const authState = setupAuthNav();
    setupLandingCtas(authState);
    bindWaitlistForm();
    initScrollReveal();
    bindPageTransitions();
    initHeroDynamics();
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
    document.body.classList.add("theme-switching");
    document.body.classList.toggle("dark-mode", normalizedTheme === "dark");
    document.documentElement.setAttribute("data-theme", normalizedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    window.setTimeout(() => {
        document.body.classList.remove("theme-switching");
    }, 320);
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

function initPageLoadState() {
    requestAnimationFrame(() => {
        document.body.classList.add("is-ready");
    });
}

function bindPageTransitions() {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    document.querySelectorAll('a[href^="/"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");
            if (!href || href.startsWith("/#")) return;
            if (link.target && link.target !== "_self") return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const currentPath = window.location.pathname.replace(/\/$/, "");
            const targetPath = href.replace(/\/$/, "");
            if (currentPath === targetPath) return;

            event.preventDefault();
            document.body.classList.add("is-leaving");
            window.setTimeout(() => {
                window.location.href = href;
            }, 160);
        });
    });
}

function initScrollReveal() {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    if (!("IntersectionObserver" in window)) return;

    const candidates = document.querySelectorAll(
        ".card, .section-head, .page-intro, .trust-strip, .hero-main, .hero-panel, .auth-branding"
    );
    if (!candidates.length) return;

    candidates.forEach((element, index) => {
        element.classList.add("reveal-item");
        element.style.setProperty("--reveal-delay", `${Math.min(index * 40, 260)}ms`);
    });

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                obs.unobserve(entry.target);
            });
        },
        { threshold: 0.16 }
    );

    candidates.forEach((element) => observer.observe(element));
}

function initHeroDynamics() {
    const heroPanel = document.querySelector(".hero-panel");
    if (!heroPanel) return;

    if (!window.matchMedia(REDUCED_MOTION_QUERY).matches) {
        heroPanel.addEventListener("mousemove", (event) => {
            const bounds = heroPanel.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
            const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
            heroPanel.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
            heroPanel.style.setProperty("--tilt-y", `${(-y).toFixed(2)}deg`);
        });
        heroPanel.addEventListener("mouseleave", () => {
            heroPanel.style.setProperty("--tilt-x", "0deg");
            heroPanel.style.setProperty("--tilt-y", "0deg");
        });
    }

    const panelNote = heroPanel.querySelector(".panel-note");
    if (!panelNote) return;
    const rotatingNotes = [
        "Weekly readiness trend based on profile improvements.",
        "Market signals recalculated from latest role demand.",
        "Skill-gap priorities adjusted for your target role."
    ];
    let activeIndex = 0;
    window.setInterval(() => {
        activeIndex = (activeIndex + 1) % rotatingNotes.length;
        panelNote.classList.add("is-swapping");
        window.setTimeout(() => {
            panelNote.textContent = rotatingNotes[activeIndex];
            panelNote.classList.remove("is-swapping");
        }, 160);
    }, 3400);
}
