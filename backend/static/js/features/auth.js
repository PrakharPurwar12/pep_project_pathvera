import { clearIdentity, getUsers, saveUsers, setAuthSession } from "../core/storage.js";
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

            const users = getUsers();
            const identifier = loginId.value.trim().toLowerCase();
            const matchedUser = users.find((user) =>
                user.email.toLowerCase() === identifier || user.username.toLowerCase() === identifier
            );

            if (!matchedUser) {
                setError("loginIdError", "No account found with this email/username.");
                return;
            }

            if (matchedUser.password !== password.value) {
                setError("passwordError", "Incorrect password.");
                return;
            }

            setAuthSession({
                username: matchedUser.username,
                fullName: matchedUser.fullName,
                email: matchedUser.email
            });
            showToast("Login successful", `Welcome ${matchedUser.username}`, "success");
            setTimeout(() => {
                window.location.href = "/";
            }, 500);
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

            const users = getUsers();
            const emailExists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());
            const usernameExists = users.some((user) => user.username.toLowerCase() === username.toLowerCase());

            if (emailExists) {
                setError("emailError", "Email already registered.");
                return;
            }
            if (usernameExists) {
                setError("usernameError", "Username already taken.");
                return;
            }

            users.push({
                fullName,
                username,
                email,
                password
            });
            saveUsers(users);

            clearIdentity();
            showToast("Registration successful", "Please sign in to continue.", "success");
            setTimeout(() => {
                window.location.href = "/login/";
            }, 500);
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
