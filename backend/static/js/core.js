document.addEventListener("DOMContentLoaded", () => {
    if (enforceAuthAccess()) return;
    bindThemeToggle();
    bindFaq();
    applyUserProfile();
    normalizeInternalLinksForStaticMode();
    setupAuthNav();
    bindWaitlistForm();
});

const THEME_STORAGE_KEY = "pv-theme";

function enforceAuthAccess() {
    const currentUser = (localStorage.getItem("pv-user-name") || "").trim();
    const currentPath = normalizeRoutePath(window.location.pathname);
    const publicRoutes = new Set(["/login", "/register"]);

    if (!currentUser && !publicRoutes.has(currentPath)) {
        window.location.href = "/login/";
        return true;
    }

    if (currentUser && publicRoutes.has(currentPath)) {
        window.location.href = "/dashboard/";
        return true;
    }

    return false;
}

function normalizeRoutePath(pathname) {
    const raw = (pathname || "/").toLowerCase().replace(/\/+$/, "");
    if (!raw) return "/";

    const lastSegment = raw.split("/").filter(Boolean).pop() || "";
    if (lastSegment.endsWith(".html")) {
        return `/${lastSegment.replace(".html", "")}`;
    }

    return raw;
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

function ensureToastWrap() {
    let wrap = document.getElementById("toastWrap");
    if (!wrap) {
        wrap = document.createElement("div");
        wrap.id = "toastWrap";
        wrap.className = "toast-wrap";
        document.body.appendChild(wrap);
    }
    return wrap;
}

function showToast(title, message, type) {
    const wrap = ensureToastWrap();
    const toast = document.createElement("article");
    toast.className = `toast ${type === "error" ? "error" : "success"}`;
    toast.innerHTML = `<p class="toast-title">${title}</p><p>${message}</p>`;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

window.pathVeraUI = {
    showToast
};

function applyUserProfile() {
    const storedFullName = (localStorage.getItem("pv-user-fullname") || "").trim();
    const storedUserName = (localStorage.getItem("pv-user-name") || "").trim();
    const displayName = storedFullName || storedUserName;
    if (!displayName) return;

    const nameNodes = document.querySelectorAll("[data-user-name]");
    const initialNodes = document.querySelectorAll("[data-user-initials]");

    nameNodes.forEach((node) => {
        node.textContent = displayName;
    });

    const initials = buildInitials(displayName);
    initialNodes.forEach((node) => {
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
    const currentUser = (localStorage.getItem("pv-user-name") || "").trim();
    const dropdownHolder = document.querySelector(".auth-dropdown");
    const toggle = document.getElementById("authToggle");
    const menu = document.getElementById("authMenu");
    if (!toggle || !menu || !dropdownHolder) return;

    const loginItem = menu.querySelector('[data-auth-item="login"]');
    const signupItem = menu.querySelector('[data-auth-item="signup"]');
    const profileItem = menu.querySelector('[data-auth-item="profile"]');
    const logoutItem = menu.querySelector('[data-auth-item="logout"]');
    const themeToggleButton = menu.querySelector("[data-theme-toggle]");

    const setMenuOpen = (isOpen) => {
        dropdownHolder.classList.toggle("open", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        menu.setAttribute("aria-hidden", isOpen ? "false" : "true");
    };

    const syncThemeToggleButton = () => {
        if (!themeToggleButton) return;
        const activeTheme = getActiveTheme();
        const isDark = activeTheme === "dark";
        themeToggleButton.textContent = isDark ? "Switch to Light" : "Switch to Dark";
        themeToggleButton.setAttribute("data-theme-state", isDark ? "dark" : "light");
        themeToggleButton.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
        themeToggleButton.classList.toggle("is-dark-state", isDark);
        themeToggleButton.classList.toggle("is-light-state", !isDark);
    };

    if (currentUser) {
        toggle.textContent = currentUser;
        loginItem?.classList.add("hidden");
        signupItem?.classList.add("hidden");
        profileItem?.classList.remove("hidden");
        logoutItem?.classList.remove("hidden");
    } else {
        toggle.textContent = "Account";
        loginItem?.classList.remove("hidden");
        signupItem?.classList.remove("hidden");
        profileItem?.classList.add("hidden");
        logoutItem?.classList.add("hidden");
    }
    syncThemeToggleButton();

    toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        const nextOpenState = !isOpen;
        setMenuOpen(nextOpenState);
        if (nextOpenState) syncThemeToggleButton();
    });

    dropdownHolder.addEventListener("mouseenter", () => {
        setMenuOpen(true);
        syncThemeToggleButton();
    });

    dropdownHolder.addEventListener("mouseleave", () => {
        setMenuOpen(false);
    });

    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && event.target !== toggle) {
            setMenuOpen(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuOpen(false);
        }
    });

    if (logoutItem) {
        logoutItem.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.removeItem("pv-user-name");
            localStorage.removeItem("pv-user-fullname");
            localStorage.removeItem("pv-chat-history-v2");
            showToast("Logged out", "You have been signed out.", "success");
            setTimeout(() => {
                window.location.href = "/login/";
            }, 250);
        });
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleTheme();
            syncThemeToggleButton();
        });
    }
}
