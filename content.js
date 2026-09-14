(() => {
  const root = document.documentElement;
  const defaultSettings = { enabled: true, disabledSites: [] };

  function hostname() {
    return location.hostname.toLowerCase();
  }

  function isDisabledForSite(settings) {
    const host = hostname();
    return settings.disabledSites.some((site) => host === site || host.endsWith(`.${site}`));
  }

  function apply(settings) {
    root.classList.toggle("dusk-reader-enabled", Boolean(settings.enabled) && !isDisabledForSite(settings));
  }

  chrome.storage.local.get(defaultSettings).then(apply);
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") chrome.storage.local.get(defaultSettings).then(apply);
  });
})();
