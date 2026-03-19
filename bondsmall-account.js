(() => {
    window.createAccountManager = function createAccountManager(options) {
        const {
            accountBtn,
            accountOverlay,
            accountBackdrop,
            closeAccountBtn,
            accountFrame,
            accountTabSignin,
            accountTabSignup,
            accountStatus,
            accountDebug,
            googleClientId,
            accountSessionKey,
            accountProfileKey,
            accountCredentialKey
        } = options;

        let accountViewSwitchTimer = null;
        let googleIdInitialized = false;

        function setAccountTab(view) {
            const isSignin = view === "signin";
            if (accountTabSignin) {
                accountTabSignin.classList.toggle("active", isSignin);
                accountTabSignin.setAttribute("aria-selected", isSignin ? "true" : "false");
            }
            if (accountTabSignup) {
                accountTabSignup.classList.toggle("active", !isSignin);
                accountTabSignup.setAttribute("aria-selected", !isSignin ? "true" : "false");
            }
        }

        function getStorageJson(key) {
            const sources = [sessionStorage, localStorage];
            for (const storage of sources) {
                try {
                    const raw = storage.getItem(key);
                    if (!raw) {
                        continue;
                    }
                    const parsed = JSON.parse(raw);
                    if (parsed) {
                        return parsed;
                    }
                } catch (_) {
                    // Ignore malformed storage payload and continue.
                }
            }
            return null;
        }

        function clearAuthStorage() {
            [sessionStorage, localStorage].forEach((storage) => {
                storage.removeItem(accountCredentialKey);
                storage.removeItem(accountProfileKey);
                storage.removeItem(accountSessionKey);
            });
        }

        function hasValidSession(session) {
            if (!session) {
                return false;
            }
            if (!session.expiresAt) {
                return true;
            }
            return new Date(session.expiresAt).getTime() > Date.now();
        }

        function setAccountStatus(message, tone = "success") {
            if (accountStatus) {
                accountStatus.textContent = message;
                if (tone === "error") {
                    accountStatus.style.color = "#a22d2d";
                } else if (tone === "warning") {
                    accountStatus.style.color = "#8a5d00";
                } else {
                    accountStatus.style.color = "#1f7a46";
                }
            }
        }

        function maskClientId(clientId) {
            if (!clientId || clientId.length < 10) {
                return "missing";
            }
            return `${clientId.slice(0, 10)}...${clientId.slice(-12)}`;
        }

        function setAccountDebug(message, isVisible = false) {
            if (!accountDebug) {
                return;
            }
            if (!message) {
                accountDebug.textContent = "";
                accountDebug.style.display = "none";
                return;
            }
            accountDebug.textContent = message;
            accountDebug.style.display = isVisible ? "block" : "none";
        }

        function clearAccountViewSwitchTimer() {
            if (accountViewSwitchTimer !== null) {
                window.clearTimeout(accountViewSwitchTimer);
                accountViewSwitchTimer = null;
            }
        }

        function showAccountView(viewName) {
            const views = {
                auth: document.getElementById("auth-view"),
                loading: document.getElementById("account-loading-view"),
                profile: document.getElementById("profile-view")
            };

            Object.entries(views).forEach(([name, element]) => {
                if (!element) {
                    return;
                }
                const isActive = name === viewName;
                element.classList.toggle("hidden", !isActive);
                element.setAttribute("aria-hidden", isActive ? "false" : "true");
            });
        }

        function showAccountLoading(profile, delay = 420) {
            document.getElementById("account-title").textContent = "Loading Account";
            document.getElementById("account-subtitle").textContent = "Preparing your profile";
            showAccountView("loading");
            clearAccountViewSwitchTimer();

            accountViewSwitchTimer = window.setTimeout(() => {
                updateAccountProfileView(profile);
                showAccountView("profile");
                accountViewSwitchTimer = null;
            }, delay);
        }

        function updateAccountProfileView(profile) {
            document.getElementById("account-user-name").textContent = profile.name || "User";
            document.getElementById("account-user-email").textContent = profile.email || "";
            if (profile.picture) {
                document.getElementById("account-profile-pic").src = profile.picture;
            }
            document.getElementById("account-title").textContent = "My Account";
            document.getElementById("account-subtitle").textContent = profile.name || "Profile";
        }

        function decodeJwtPayload(jwtToken) {
            try {
                const payloadPart = jwtToken.split(".")[1];
                const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
                const json = decodeURIComponent(atob(normalized).split("").map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join(""));
                return JSON.parse(json);
            } catch (_) {
                return null;
            }
        }

        function saveAccountSession(account) {
            const payload = JSON.stringify(account);
            sessionStorage.setItem(accountSessionKey, payload);
            localStorage.setItem(accountSessionKey, payload);
        }

        function saveGoogleAccountProfile(account) {
            const credentialPayload = JSON.stringify({
                mode: "google",
                email: account.email,
                name: account.name,
                provider: "google",
                savedAt: account.signedInAt
            });

            const profilePayload = JSON.stringify({
                username: (account.email || "user").split("@")[0],
                name: account.name || "Google User",
                email: account.email || "",
                address: "123 Main Street",
                city: "New York",
                state: "NY",
                zip: "10001",
                country: "USA",
                picture: account.picture || null
            });

            sessionStorage.setItem(accountCredentialKey, credentialPayload);
            localStorage.setItem(accountCredentialKey, credentialPayload);
            sessionStorage.setItem(accountProfileKey, profilePayload);
            localStorage.setItem(accountProfileKey, profilePayload);
        }

        function handleGoogleIdCredentialResponse(response) {
            if (!response || !response.credential) {
                setAccountStatus("Google sign-in failed. Please try again.", "error");
                return;
            }

            const profile = decodeJwtPayload(response.credential);
            if (!profile) {
                setAccountStatus("Google sign-in failed. Invalid identity response.", "error");
                return;
            }

            const account = {
                provider: "google",
                email: profile.email || "",
                name: profile.name || "Google User",
                picture: profile.picture || "",
                signedInAt: new Date().toISOString(),
                expiresAt: profile.exp ? new Date(profile.exp * 1000).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString()
            };

            saveAccountSession(account);
            saveGoogleAccountProfile(account);
            updateAccountProfileView(account);
            showAccountView("profile");
            setAccountStatus(`Successfully logged in as ${account.name}`);
            setAccountDebug("");
        }

        function setupGoogleAccountButton() {
            const triggerGoogleAuth = () => {
                if (!googleClientId) {
                    alert("Google sign-in is not configured yet.");
                    return;
                }
                if (!(window.google && window.google.accounts && window.google.accounts.id)) {
                    alert("Google SDK is not ready yet. Refresh and try again.");
                    return;
                }

                setAccountDebug("");

                if (!googleIdInitialized) {
                    window.google.accounts.id.initialize({
                        client_id: googleClientId,
                        callback: handleGoogleIdCredentialResponse,
                        auto_select: false,
                        use_fedcm_for_prompt: true
                    });
                    googleIdInitialized = true;
                }

                window.google.accounts.id.prompt((notification) => {
                    if (!notification) {
                        return;
                    }

                    const isNotDisplayed = typeof notification.isNotDisplayed === "function" && notification.isNotDisplayed();
                    const isSkippedMoment = typeof notification.isSkippedMoment === "function" && notification.isSkippedMoment();
                    const dismissedReason = typeof notification.getDismissedReason === "function" ? notification.getDismissedReason() : "n/a";

                    if (isNotDisplayed || isSkippedMoment) {
                        console.warn("Google prompt blocked/skipped", {
                            origin: window.location.origin,
                            notDisplayedReason: typeof notification.getNotDisplayedReason === "function" ? notification.getNotDisplayedReason() : "n/a",
                            skippedReason: typeof notification.getSkippedReason === "function" ? notification.getSkippedReason() : "n/a",
                            dismissedReason
                        });
                    }
                });
            };

            window.triggerGoogleAuthFromAccountFrame = triggerGoogleAuth;
        }

        function openAccountDrawer(view = "signin") {
            if (!accountOverlay) {
                return;
            }

            const credential = getStorageJson(accountCredentialKey);
            const profile = getStorageJson(accountProfileKey);
            const savedSession = getStorageJson(accountSessionKey);

            if (savedSession && !hasValidSession(savedSession)) {
                clearAuthStorage();
            }

            if (credential && profile && hasValidSession(savedSession)) {
                showAccountLoading(profile, 320);
                setAccountStatus(`Successfully logged in as ${profile.name || "User"}`);
            } else {
                document.getElementById("account-title").textContent = "Account";
                document.getElementById("account-subtitle").textContent = "Sign in or create your account";
                showAccountView("auth");

                if (accountFrame) {
                    const frameSrc = view === "signup" ? "signup.html" : "signin.html";
                    if (!accountFrame.src.endsWith(`/${frameSrc}`)) {
                        accountFrame.src = frameSrc;
                    }
                    setAccountTab(view);
                }
            }

            accountOverlay.classList.remove("hidden");
            accountOverlay.setAttribute("aria-hidden", "false");
            requestAnimationFrame(() => {
                accountOverlay.classList.add("open");
            });
        }

        function closeAccountDrawer() {
            if (!accountOverlay) {
                return;
            }
            clearAccountViewSwitchTimer();
            accountOverlay.classList.remove("open");
            accountOverlay.setAttribute("aria-hidden", "true");
            window.setTimeout(() => {
                accountOverlay.classList.add("hidden");
            }, 280);
        }

        function setupAccountDrawer() {
            if (accountBtn) {
                accountBtn.addEventListener("click", () => openAccountDrawer("signin"));
            }
            if (closeAccountBtn) {
                closeAccountBtn.addEventListener("click", closeAccountDrawer);
            }
            if (accountBackdrop) {
                accountBackdrop.addEventListener("click", closeAccountDrawer);
            }
            if (accountTabSignin) {
                accountTabSignin.addEventListener("click", () => openAccountDrawer("signin"));
            }
            if (accountTabSignup) {
                accountTabSignup.addEventListener("click", () => openAccountDrawer("signup"));
            }

            window.addEventListener("message", (event) => {
                if (event.origin !== window.location.origin) {
                    return;
                }
                if (event.data && event.data.type === "request-google-auth") {
                    if (typeof window.triggerGoogleAuthFromAccountFrame === "function") {
                        window.triggerGoogleAuthFromAccountFrame();
                    }
                    return;
                }
                if (!event.data || event.data.type !== "account-saved") {
                    return;
                }

                const profile = getStorageJson(accountProfileKey);
                if (profile) {
                    showAccountLoading(profile, 520);
                    setAccountStatus(`Successfully logged in as ${profile.name || "User"}`);
                }
            });

            const savedSession = getStorageJson(accountSessionKey);
            if (savedSession && hasValidSession(savedSession) && savedSession.name) {
                setAccountStatus(`Successfully logged in as ${savedSession.name}`);
            } else if (savedSession && !hasValidSession(savedSession)) {
                clearAuthStorage();
            }

            const logoutBtn = document.getElementById("logout-btn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", () => {
                    clearAuthStorage();
                    setAccountStatus("Signed out.");

                    document.getElementById("account-title").textContent = "Account";
                    document.getElementById("account-subtitle").textContent = "Sign in or create your account";
                    showAccountView("auth");

                    window.setTimeout(() => {
                        closeAccountDrawer();
                    }, 160);
                });
            }

            setupGoogleAccountButton();
        }

        return {
            openAccountDrawer,
            closeAccountDrawer,
            setupAccountDrawer
        };
    };
})();
