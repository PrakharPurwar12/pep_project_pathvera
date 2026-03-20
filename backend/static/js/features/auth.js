import { apiRequest } from "../api/apiClient.js";
import { clearIdentity, setAuthProfile, setAuthSession } from "../core/storage.js";
import { showToast } from "../core/ui.js";

export function initAuth() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    bindPasswordToggles();
    bindStrengthMeter();

    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();

            clearErrors(loginForm);
            const loginId = document.getElementById("loginId");
            const password = document.getElementById("password");
            let hasError = false;

            if (!loginId || !loginId.value.trim()) {
                setError("loginIdError", "Enter email or username.");
                hasError = true;
            }
            if (!password || !password.value.trim()) {
                setError("passwordError", "Password is required.");
                hasError = true;
            }

            if (hasError) return;
            const identifier = loginId.value.trim();
            apiRequest("/api/auth/login/", {
                method: "POST",
                body: JSON.stringify({
                    login_id: identifier,
                    password: password.value
                })
            })
                .then((data) => {
                    const user = data?.user || {};
                    setAuthSession({
                        username: user.username || "",
                        fullName: user.full_name || user.username || "",
                        email: user.email || ""
                    });
                    setAuthProfile({
                        username: user.username || "",
                        fullName: user.full_name || user.username || "",
                        email: user.email || "",
                        location: user.location || "",
                        bio: user.bio || ""
                    });
                    showToast("Login successful", `Welcome ${user.username || "back"}`, "success");
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 350);
                })
                .catch((error) => {
                    if (error?.status === 401) {
                        setError("passwordError", "Incorrect credentials.");
                        return;
                    }
                    setError("loginIdError", error.message || "Login failed.");
                });
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", (event) => {
            event.preventDefault();
            clearErrors(registerForm);

            const fullName = document.getElementById("fullName")?.value.trim();
            const username = document.getElementById("username")?.value.trim();
            const email = document.getElementById("email")?.value.trim();
            const password = document.getElementById("password")?.value;
            const confirmPassword = document.getElementById("confirmPassword")?.value;
            let hasError = false;

            if (!fullName || !username || !email || !password || !confirmPassword) {
                setError("registerError", "Please complete all fields.");
                hasError = true;
            }

            if (username && !/^[a-zA-Z0-9._]{3,20}$/.test(username)) {
                setError("usernameError", "Username must be 3-20 chars (letters, numbers, . or _).");
                hasError = true;
            }
            if (email && !/.+@.+\..+/.test(email)) {
                setError("emailError", "Enter a valid email.");
                hasError = true;
            }
            if (password && confirmPassword && password !== confirmPassword) {
                setError("confirmPasswordError", "Passwords do not match.");
                hasError = true;
            }
            if (hasError) return;
            apiRequest("/api/auth/register/", {
                method: "POST",
                body: JSON.stringify({
                    full_name: fullName,
                    username,
                    email,
                    password
                })
            })
                .then(() => {
                    clearIdentity();
                    showToast("Registration successful", "Please sign in to continue.", "success");
                    setTimeout(() => {
                        window.location.href = "/login/";
                    }, 350);
                })
                .catch((error) => {
                    const message = (error?.message || "").toLowerCase();
                    if (message.includes("username")) {
                        setError("usernameError", error.message);
                        return;
                    }
                    if (message.includes("email")) {
                        setError("emailError", error.message);
                        return;
                    }
                    if (message.includes("password")) {
                        setError("passwordError", error.message);
                        return;
                    }
                    setError("registerError", error.message || "Registration failed.");
                });
        });
    }
}

function bindPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-target");
            const field = targetId ? document.getElementById(targetId) : null;
            if (!field) return;
            if (field.type === "password") {
                field.type = "text";
                button.textContent = "Hide";
            } else {
                field.type = "password";
                button.textContent = "Show";
            }
        });
    });
}

function bindStrengthMeter() {
    const field = document.getElementById("password");
    const meter = document.querySelector(".password-strength span");
    const hint = document.getElementById("passwordError");
    if (!field || !meter || !hint) return;

    field.addEventListener("input", () => {
        const score = getStrength(field.value);
        meter.style.width = `${score.value}%`;
        meter.style.backgroundColor = score.color;
        hint.textContent = score.label;
        hint.classList.remove("error");
    });
}

function getStrength(value) {
    let score = 0;
    if (value.length >= 8) score += 25;
    if (/[A-Z]/.test(value)) score += 25;
    if (/[0-9]/.test(value)) score += 25;
    if (/[^A-Za-z0-9]/.test(value)) score += 25;
    if (score <= 25) return { value: 25, label: "Weak password", color: "#d64545" };
    if (score <= 50) return { value: 50, label: "Average password", color: "#ff9f43" };
    if (score <= 75) return { value: 75, label: "Good password", color: "#0c8eff" };
    return { value: 100, label: "Strong password", color: "#11c08f" };
}

function setError(id, text) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = text;
    node.classList.add("error");
}

function clearErrors(form) {
    form.querySelectorAll(".form-hint").forEach((node) => {
        node.textContent = "";
        node.classList.remove("error");
    });
}
