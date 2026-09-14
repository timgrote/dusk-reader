const defaults = { enabled: true, disabledSites: [] };
const enabled = document.querySelector("#enabled");
const siteEnabled = document.querySelector("#site-enabled");
const site = document.querySelector("#site");
const restricted = document.querySelector("#restricted");
let host = null;

function disabledForSite(settings) {
  return settings.disabledSites.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

async function getSettings() {
  return chrome.storage.local.get(defaults);
}

async function render() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    host = new URL(tab.url).hostname.toLowerCase();
  } catch {
    enabled.disabled = true;
    siteEnabled.disabled = true;
    restricted.hidden = false;
    return;
  }
  const settings = await getSettings();
  enabled.checked = settings.enabled;
  siteEnabled.checked = settings.enabled && !disabledForSite(settings);
  siteEnabled.disabled = !settings.enabled;
  site.textContent = host;
}

enabled.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabled.checked });
  siteEnabled.disabled = !enabled.checked;
  if (!enabled.checked) siteEnabled.checked = false;
});

siteEnabled.addEventListener("change", async () => {
  if (!host) return;
  const settings = await getSettings();
  const disabledSites = settings.disabledSites.filter((entry) => entry !== host);
  if (!siteEnabled.checked) disabledSites.push(host);
  await chrome.storage.local.set({ disabledSites });
});

render();
