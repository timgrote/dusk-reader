(() => {
  const root = document.documentElement;
  const defaultSettings = { enabled: true, disabledSites: [], themeMode: "unknown", themePalette: {} };
  const darkPreference = window.matchMedia("(prefers-color-scheme: dark)");
  let currentSettings;

  function hostname() {
    return location.hostname.toLowerCase();
  }

  function isDisabledForSite(settings) {
    const host = hostname();
    return settings.disabledSites.some((site) => host === site || host.endsWith(`.${site}`));
  }

  function apply(settings) {
    currentSettings = settings;
    const palette = settings.themePalette || {};
    const names = {
      background: "--dusk-background",
      foreground: "--dusk-foreground",
      accent: "--dusk-accent",
      surface: "--dusk-surface",
      muted: "--dusk-muted",
      selection: "--dusk-selection"
    };
    for (const [key, variable] of Object.entries(names)) {
      if (typeof palette[key] === "string" && /^#[0-9a-f]{6}$/i.test(palette[key])) {
        root.style.setProperty(variable, palette[key]);
      } else {
        root.style.removeProperty(variable);
      }
    }
    const darkTheme = settings.themeMode === "dark" ||
      (settings.themeMode !== "light" && darkPreference.matches);
    const enabled = Boolean(settings.enabled) && darkTheme && !isDisabledForSite(settings);
    root.classList.toggle("dusk-reader-enabled", enabled);
  }

  chrome.storage.local.get(defaultSettings).then(apply);
  darkPreference.addEventListener("change", () => {
    if (currentSettings) apply(currentSettings);
  });
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") chrome.storage.local.get(defaultSettings).then(apply);
  });
})();
