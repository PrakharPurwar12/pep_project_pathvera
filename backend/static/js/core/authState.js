import { getAuthProfile } from "./storage.js";

export function normalizeRoutePath(pathname) {
    const raw = (pathname || "/").toLowerCase().replace(/\/+$/, "");
    if (!raw) return "/";

    const lastSegment = raw.split("/").filter(Boolean).pop() || "";
    if (lastSegment.endsWith(".html")) {
        return `/${lastSegment.replace(".html", "")}`;
    }

    return raw;
}

export function getAuthUser() {
    const local = getAuthProfile();
    const navNode = document.querySelector("nav[data-server-auth]");
    const serverUser = (navNode?.getAttribute("data-server-user") || "").trim();
    const username = local.username || serverUser;

    return {
        username,
        fullName: local.fullName,
        email: local.email
    };
}

export function isAuthenticated() {
    return Boolean(getAuthProfile().username);
}

export function resolveAuthState() {
    const user = getAuthUser();
    return {
        isAuthenticated: isAuthenticated(),
        username: user.username
    };
}

export function enforceAuthAccess() {
    const auth = resolveAuthState();
    const currentPath = normalizeRoutePath(window.location.pathname);
    const publicRoutes = new Set(["/", "/index", "/login", "/register"]);

    if (!auth.isAuthenticated && !publicRoutes.has(currentPath)) {
        window.location.href = "/login/";
        return true;
    }

    if (auth.isAuthenticated && (currentPath === "/login" || currentPath === "/register")) {
        window.location.href = "/";
        return true;
    }

    return false;
}
