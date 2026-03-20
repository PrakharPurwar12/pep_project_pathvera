function mergeHeaders(defaultHeaders, customHeaders) {
    const headers = new Headers(defaultHeaders);
    if (!customHeaders) return headers;
    new Headers(customHeaders).forEach((value, key) => headers.set(key, value));
    return headers;
}

function getCsrfToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    if (metaToken && metaToken !== "NOTPROVIDED") return metaToken;

    const cookieToken = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("csrftoken="));
    if (!cookieToken) return "";
    return decodeURIComponent(cookieToken.split("=").slice(1).join("="));
}

async function parseResponsePayload(response) {
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
}

export async function apiRequest(url, options = {}) {
    const { headers: customHeaders, body, ...rest } = options;
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const defaultHeaders = isFormData ? {} : { "Content-Type": "application/json" };
    const headers = mergeHeaders(defaultHeaders, customHeaders);
    const method = String(rest.method || "GET").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) headers.set("X-CSRFToken", csrfToken);
    }

    const response = await fetch(url, {
        credentials: "same-origin",
        ...rest,
        headers,
        body
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
        let message = "API request failed";
        if (payload && typeof payload === "object" && typeof payload.error === "string") {
            message = payload.error;
        } else if (typeof payload === "string" && payload.trim()) {
            message = payload;
        }
        const error = new Error(message);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
}
