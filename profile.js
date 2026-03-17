(() => {
    const defaultProfile = {
        username: "user@bonds",
        name: "John Doe",
        email: "user@example.com",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA",
        picture: null
    };

    function getProfile() {
        // Check if user is logged in
        const credential = JSON.parse(localStorage.getItem("fc_account_credential") || "null");
        const savedProfile = JSON.parse(localStorage.getItem("fc_profile") || "null");
        
        // If there's a credential, ensure profile is initialized with that email
        if (credential && savedProfile) {
            return savedProfile;
        }
        
        return savedProfile || defaultProfile;
    }

    function saveProfile(profile) {
        localStorage.setItem("fc_profile", JSON.stringify(profile));
    }

    function showFeedback(elementId, message, isError = false) {
        const fb = document.getElementById(elementId);
        fb.textContent = message;
        fb.classList.toggle('error', isError);
        setTimeout(() => { fb.textContent = ''; }, 3000);
    }

    function loadProfileData() {
        const profile = getProfile();
        
        document.getElementById('username-display').textContent = profile.username;
        document.getElementById('name-display').textContent = profile.name;
        document.getElementById('email-display').textContent = profile.email;
        document.getElementById('address-display').textContent = profile.address;
        document.getElementById('city-display').textContent = profile.city;
        document.getElementById('state-display').textContent = profile.state;
        document.getElementById('zip-display').textContent = profile.zip;
        document.getElementById('country-display').textContent = profile.country;

        if (profile.picture) {
            document.getElementById('profile-pic').src = profile.picture;
        }
    }

    // Profile picture upload
    document.getElementById('upload-pic-btn').addEventListener('click', () => {
        document.getElementById('pic-input').click();
    });

    document.getElementById('pic-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const profile = getProfile();
            profile.picture = event.target.result;
            saveProfile(profile);
            document.getElementById('profile-pic').src = event.target.result;
            showFeedback('username-feedback', 'Profile picture updated!');
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('remove-pic-btn').addEventListener('click', () => {
        const profile = getProfile();
        profile.picture = null;
        saveProfile(profile);
        document.getElementById('profile-pic').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='20' fill='%236f6356'/%3E%3Cellipse cx='50' cy='75' rx='28' ry='22' fill='%236f6356'/%3E%3C/svg%3E";
        showFeedback('username-feedback', 'Profile picture removed');
    });

    // Edit handlers
    document.getElementById('edit-username-btn').addEventListener('click', () => {
        document.getElementById('username-input').value = getProfile().username;
        document.getElementById('username-modal').classList.add('active');
        document.getElementById('username-input').focus();
    });

    document.getElementById('save-username-btn').addEventListener('click', () => {
        const value = document.getElementById('username-input').value.trim();
        if (!value) {
            showFeedback('username-feedback', 'Username cannot be empty', true);
            return;
        }
        const profile = getProfile();
        profile.username = value;
        saveProfile(profile);
        document.getElementById('username-display').textContent = value;
        document.getElementById('username-modal').classList.remove('active');
        showFeedback('username-feedback', 'Username updated!');
    });

    document.getElementById('edit-name-btn').addEventListener('click', () => {
        document.getElementById('name-input').value = getProfile().name;
        document.getElementById('name-modal').classList.add('active');
        document.getElementById('name-input').focus();
    });

    document.getElementById('save-name-btn').addEventListener('click', () => {
        const value = document.getElementById('name-input').value.trim();
        if (!value) {
            showFeedback('name-feedback', 'Name cannot be empty', true);
            return;
        }
        const profile = getProfile();
        profile.name = value;
        saveProfile(profile);
        document.getElementById('name-display').textContent = value;
        document.getElementById('name-modal').classList.remove('active');
        showFeedback('name-feedback', 'Name updated!');
    });

    document.getElementById('edit-email-btn').addEventListener('click', () => {
        document.getElementById('email-input').value = getProfile().email;
        document.getElementById('email-modal').classList.add('active');
        document.getElementById('email-input').focus();
    });

    document.getElementById('save-email-btn').addEventListener('click', () => {
        const value = document.getElementById('email-input').value.trim();
        if (!value || !value.includes('@')) {
            showFeedback('email-feedback', 'Please enter a valid email', true);
            return;
        }
        const profile = getProfile();
        profile.email = value;
        saveProfile(profile);
        document.getElementById('email-display').textContent = value;
        document.getElementById('email-modal').classList.remove('active');
        showFeedback('email-feedback', 'Email updated!');
    });

    document.getElementById('edit-address-btn').addEventListener('click', () => {
        const profile = getProfile();
        document.getElementById('address-input').value = profile.address;
        document.getElementById('city-input').value = profile.city;
        document.getElementById('state-input').value = profile.state;
        document.getElementById('zip-input').value = profile.zip;
        document.getElementById('country-input').value = profile.country;
        document.getElementById('address-modal').classList.add('active');
        document.getElementById('address-input').focus();
    });

    document.getElementById('save-address-btn').addEventListener('click', () => {
        const address = document.getElementById('address-input').value.trim();
        const city = document.getElementById('city-input').value.trim();
        const state = document.getElementById('state-input').value.trim();
        const zip = document.getElementById('zip-input').value.trim();
        const country = document.getElementById('country-input').value.trim();

        if (!address || !city || !state || !zip || !country) {
            showFeedback('address-feedback', 'Please fill in all fields', true);
            return;
        }

        const profile = getProfile();
        profile.address = address;
        profile.city = city;
        profile.state = state;
        profile.zip = zip;
        profile.country = country;
        saveProfile(profile);

        document.getElementById('address-display').textContent = address;
        document.getElementById('city-display').textContent = city;
        document.getElementById('state-display').textContent = state;
        document.getElementById('zip-display').textContent = zip;
        document.getElementById('country-display').textContent = country;
        document.getElementById('address-modal').classList.remove('active');
        showFeedback('address-feedback', 'Address updated!');
    });

    // Delete account
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        document.getElementById('delete-modal').classList.add('active');
        document.getElementById('delete-confirm-input').focus();
    });

    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        const confirmText = document.getElementById('delete-confirm-input').value.trim();
        if (confirmText !== 'DELETE') {
            showFeedback('delete-feedback', 'Type DELETE to confirm', true);
            return;
        }

        // Clear all user data
        localStorage.clear();
        showFeedback('delete-feedback', 'Account deleted. Redirecting...');
        setTimeout(() => {
            window.location.href = 'bondsmall.html';
        }, 2000);
    });

    // Close modals on background click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    window.addEventListener('DOMContentLoaded', loadProfileData);
})();
