const STORAGE_KEYS = {
    userName: "pv-user-name",
    userFullName: "pv-user-fullname",
    userEmail: "pv-user-email",
    profileLocation: "pv-profile-location",
    profileBio: "pv-profile-bio",
    users: "pv-users",
    chatHistory: "pv-chat-history-v2",
    legacyChatHistory: "pv-chat-history",
    legacyResumeAnalysis: "pv_resume_analysis"
};

function readText(key) {
    return (localStorage.getItem(key) || "").trim();
}

export function getStorageKeys() {
    return { ...STORAGE_KEYS };
}

export function getCurrentUserName() {
    return readText(STORAGE_KEYS.userName).toLowerCase();
}

export function getAnalysisStorageKey(username) {
    return `analysisData:${String(username || "").trim().toLowerCase()}`;
}

export function getResumeUploadedKey(username) {
    return `resumeUploaded:${String(username || "").trim().toLowerCase()}`;
}

export function getAuthProfile() {
    return {
        username: readText(STORAGE_KEYS.userName),
        fullName: readText(STORAGE_KEYS.userFullName),
        email: readText(STORAGE_KEYS.userEmail),
        location: readText(STORAGE_KEYS.profileLocation),
        bio: readText(STORAGE_KEYS.profileBio)
    };
}

export function setAuthProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.userName, String(profile?.username || ""));
    localStorage.setItem(STORAGE_KEYS.userFullName, String(profile?.fullName || ""));
    localStorage.setItem(STORAGE_KEYS.userEmail, String(profile?.email || ""));
    localStorage.setItem(STORAGE_KEYS.profileLocation, String(profile?.location || ""));
    localStorage.setItem(STORAGE_KEYS.profileBio, String(profile?.bio || ""));
}

export function clearAuthSession() {
    localStorage.removeItem(STORAGE_KEYS.userName);
    localStorage.removeItem(STORAGE_KEYS.userFullName);
    localStorage.removeItem(STORAGE_KEYS.chatHistory);
}

export function setAuthSession(session) {
    localStorage.setItem(STORAGE_KEYS.userName, String(session?.username || ""));
    localStorage.setItem(STORAGE_KEYS.userFullName, String(session?.fullName || ""));
    localStorage.setItem(STORAGE_KEYS.userEmail, String(session?.email || ""));
}

export function clearIdentity() {
    localStorage.removeItem(STORAGE_KEYS.userName);
    localStorage.removeItem(STORAGE_KEYS.userFullName);
}

export function getChatHistoryKey() {
    return STORAGE_KEYS.chatHistory;
}

export function clearDeprecatedChatHistory() {
    localStorage.removeItem(STORAGE_KEYS.legacyChatHistory);
}

export function getLegacyResumeAnalysis() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.legacyResumeAnalysis) || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        return {};
    }
}

export function hasResumeUploaded(username) {
    return localStorage.getItem(getResumeUploadedKey(username)) === "1";
}

export function readAnalysisForUser(username) {
    try {
        const raw = localStorage.getItem(getAnalysisStorageKey(username));
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

export function saveAnalysisForUser(username, data) {
    localStorage.setItem(getAnalysisStorageKey(username), JSON.stringify(data));
    localStorage.setItem(getResumeUploadedKey(username), "1");
}

export function getUsers() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.users);
        const users = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(users)) return [];
        return users
            .filter((user) => user && typeof user === "object")
            .map((user) => ({
                fullName: user.fullName || "",
                username: user.username || deriveUsernameFallback(user.email || user.fullName || ""),
                email: user.email || "",
                password: user.password || ""
            }));
    } catch (error) {
        return [];
    }
}

export function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

export function deriveUsernameFallback(seed) {
    const clean = String(seed).split("@")[0].replace(/[^a-zA-Z0-9._]/g, "").trim();
    return clean || "user";
}
