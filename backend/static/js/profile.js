document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("profileForm");
    const fullName = document.getElementById("profileFullName");
    const username = document.getElementById("profileUsername");
    const email = document.getElementById("profileEmail");
    const location = document.getElementById("profileLocation");
    const bio = document.getElementById("profileBio");

    if (!form || !fullName || !username || !email || !location || !bio) return;

    hydrateProfile();

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const normalizedFullName = fullName.value.trim();
        const normalizedUsername = username.value.trim();
        const normalizedEmail = email.value.trim();
        const normalizedLocation = location.value.trim();
        const normalizedBio = bio.value.trim();

        if (!normalizedFullName || !normalizedUsername) {
            window.pathVeraUI?.showToast("Profile not saved", "Full name and username are required.", "error");
            return;
        }

        localStorage.setItem("pv-user-fullname", normalizedFullName);
        localStorage.setItem("pv-user-name", normalizedUsername);
        localStorage.setItem("pv-user-email", normalizedEmail);
        localStorage.setItem("pv-profile-location", normalizedLocation);
        localStorage.setItem("pv-profile-bio", normalizedBio);

        window.pathVeraUI?.showToast("Profile saved", "Your profile details were updated.", "success");
    });

    function hydrateProfile() {
        fullName.value = (localStorage.getItem("pv-user-fullname") || "").trim();
        username.value = (localStorage.getItem("pv-user-name") || "").trim();
        email.value = (localStorage.getItem("pv-user-email") || "").trim();
        location.value = (localStorage.getItem("pv-profile-location") || "").trim();
        bio.value = (localStorage.getItem("pv-profile-bio") || "").trim();
    }
});
