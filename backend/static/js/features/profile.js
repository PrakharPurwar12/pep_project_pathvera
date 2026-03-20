import { getAuthProfile, setAuthProfile } from "../core/storage.js";
import { showToast } from "../core/ui.js";

export function initProfile() {
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
            showToast("Profile not saved", "Full name and username are required.", "error");
            return;
        }

        setAuthProfile({
            fullName: normalizedFullName,
            username: normalizedUsername,
            email: normalizedEmail,
            location: normalizedLocation,
            bio: normalizedBio
        });

        showToast("Profile saved", "Your profile details were updated.", "success");
    });

    function hydrateProfile() {
        const profile = getAuthProfile();
        fullName.value = profile.fullName;
        username.value = profile.username;
        email.value = profile.email;
        location.value = profile.location;
        bio.value = profile.bio;
    }
}
