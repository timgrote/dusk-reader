const defaults = { enabled: true, disabledSites: [], themeMode: "unknown", themePalette: {} };
const siteMenuId = "toggle-site";
const themeAlarm = "refresh-omarchy-theme";
const nativeHost = "io.github.tim.dusk_reader";
const lupine = {
  on: "#3264eb",
  off: "#64748b",
  paper: "#f8fafc"
};

function iconImage(enabled) {
  const size = 32;
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");
  const color = enabled ? lupine.on : lupine.off;

  context.clearRect(0, 0, size, size);
  context.fillStyle = color;
  context.beginPath();
  context.arc(16, 16, 14, 0, Math.PI * 2);
  context.fill();

  // A crescent makes the state legible in Brave's toolbar at any icon size.
  context.fillStyle = lupine.paper;
  context.beginPath();
  context.arc(14, 16, 8.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = color;
  context.beginPath();
  context.arc(18.5, 12.5, 8.5, 0, Math.PI * 2);
  context.fill();
  return context.getImageData(0, 0, size, size);
}

async function settings() {
  return chrome.storage.local.get(defaults);
}

function effectiveEnabled(current) {
  return current.enabled && current.themeMode !== "light";
}

async function setActionState() {
  const current = await settings();
  const enabled = effectiveEnabled(current);
  const suffix = !current.enabled ? "off" : current.themeMode === "light" ? "off (light Omarchy theme)" :
    current.themeMode === "dark" ? "on" : "enabled (follows browser light/dark preference)";
  await chrome.action.setIcon({ imageData: iconImage(enabled) });
  await chrome.action.setTitle({ title: `Dusk Reader: ${suffix}` });
}

function validColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function validTheme(message) {
  if (!message || !["light", "dark"].includes(message.mode) || !message.palette) return false;
  return ["background", "foreground", "accent", "surface", "muted", "selection"].every((key) => validColor(message.palette[key]));
}

async function refreshOmarchyTheme() {
  const { os } = await chrome.runtime.getPlatformInfo();
  if (os === "win") return;
  try {
    const message = await chrome.runtime.sendNativeMessage(nativeHost, { type: "get-theme" });
    if (!validTheme(message)) return;
    await chrome.storage.local.set({ themeMode: message.mode, themePalette: message.palette });
  } catch {
    // The optional local bridge is not installed yet, or Brave has stopped it.
  }
}

async function startThemeRefresh() {
  const { os } = await chrome.runtime.getPlatformInfo();
  if (os === "win") {
    await chrome.alarms.clear(themeAlarm);
    // Discard any old bridge state: Windows follows the browser preference.
    await chrome.storage.local.set({ themeMode: "unknown", themePalette: {} });
    return;
  }
  chrome.alarms.create(themeAlarm, { periodInMinutes: 1 });
  refreshOmarchyTheme();
}

function hostForTab(tab) {
  try {
    return new URL(tab?.url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isDisabledForSite(disabledSites, host) {
  return disabledSites.some((site) => host === site || host.endsWith(`.${site}`));
}

async function updateSiteMenu(tab) {
  const host = hostForTab(tab);
  if (!host) {
    await chrome.contextMenus.update(siteMenuId, { visible: false });
    return;
  }
  const { disabledSites } = await settings();
  const excluded = isDisabledForSite(disabledSites, host);
  await chrome.contextMenus.update(siteMenuId, {
    visible: true,
    title: `${excluded ? "Enable" : "Disable"} dark mode on ${host}`
  });
}

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: siteMenuId,
      title: "Toggle dark mode for this site",
      contexts: ["action", "page"]
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createMenus();
  setActionState();
  startThemeRefresh();
});

chrome.runtime.onStartup.addListener(() => {
  setActionState();
  startThemeRefresh();
});

chrome.action.onClicked.addListener(async () => {
  const current = await settings();
  await chrome.storage.local.set({ enabled: !current.enabled });
});

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") setActionState();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === themeAlarm) refreshOmarchyTheme();
});

chrome.contextMenus.onShown.addListener(async (_info, tab) => {
  await updateSiteMenu(tab);
  chrome.contextMenus.refresh();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== siteMenuId) return;
  const host = hostForTab(tab);
  if (!host) return;
  const current = await settings();
  const excluded = isDisabledForSite(current.disabledSites, host);
  const disabledSites = current.disabledSites.filter((site) => site !== host);
  if (!excluded) disabledSites.push(host);
  await chrome.storage.local.set({ disabledSites });
});
