(() => {
  let pendingInstallPrompt = null;

  const isStandaloneApp = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    pendingInstallPrompt = event;
    document.documentElement.classList.add("pwa-install-available");
  });

  window.addEventListener("appinstalled", () => {
    pendingInstallPrompt = null;
    document.documentElement.classList.remove("pwa-install-available");
    document.documentElement.classList.add("pwa-installed");
  });

  document.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-app-platform]");
    if (!action) return;

    const platform = action.dataset.appPlatform;
    if (isStandalone()) {
      event.preventDefault();
      window.location.assign("/index.html");
      return;
    }

    if (platform !== "android" || !pendingInstallPrompt) return;

    event.preventDefault();
    const prompt = pendingInstallPrompt;
    pendingInstallPrompt = null;
    document.documentElement.classList.remove("pwa-install-available");

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "dismissed") {
        window.location.assign(action.href);
      } else if (choice?.outcome === "accepted") {
        window.location.assign("/index.html");
      }
    } catch {
      window.location.assign(action.href);
    }
  });

  if ("serviceWorker" in navigator && window.location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch((error) => {
        console.warn("Bonds Mall app support could not be registered.", error);
      });
    });
  }
})();
