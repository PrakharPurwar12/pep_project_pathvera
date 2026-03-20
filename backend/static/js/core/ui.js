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

export function showToast(title, message, type = "success") {
    const wrap = ensureToastWrap();
    const toast = document.createElement("article");
    toast.className = `toast ${type === "error" ? "error" : "success"}`;
    toast.innerHTML = `<p class="toast-title">${title}</p><p>${message}</p><span class="toast-progress"></span>`;
    wrap.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.add("toast-in");
    });
    setTimeout(() => {
        toast.classList.remove("toast-in");
        toast.classList.add("toast-out");
        setTimeout(() => toast.remove(), 240);
    }, 2800);
}

export function showLoading(element) {
    if (!element) return;
    element.classList.add("is-loading");
    element.setAttribute("aria-busy", "true");

    if ("disabled" in element) {
        element.dataset.wasDisabled = element.disabled ? "1" : "0";
        element.disabled = true;
    }
}

export function hideLoading(element) {
    if (!element) return;
    element.classList.remove("is-loading");
    element.removeAttribute("aria-busy");

    if ("disabled" in element) {
        const wasDisabled = element.dataset.wasDisabled === "1";
        element.disabled = wasDisabled;
        delete element.dataset.wasDisabled;
    }
}

export function registerLegacyUiBridge() {
    window.pathVeraUI = {
        showToast
    };
}
