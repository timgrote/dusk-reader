(() => {
  const root = document.documentElement;
  const defaultSettings = { enabled: true, disabledSites: [], themeMode: "unknown", themePalette: {} };
  const darkPreference = window.matchMedia("(prefers-color-scheme: dark)");
  let currentSettings;
  const surfaceAttribute = "data-dusk-reader-surface";
  const pendingSurfaces = new Set();
  let surfaceFrame = null;

  function opaqueColor(color) {
    if (!color || color === "transparent") return false;
    // Computed sRGB colors use rgb()/rgba(); other color spaces use / alpha.
    const slashAlpha = color.match(/\/\s*([\d.]+)(%)?\s*\)$/);
    if (slashAlpha) return Number(slashAlpha[1]) >= (slashAlpha[2] ? 100 : 1);
    const rgbaAlpha = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
    return !rgbaAlpha || Number(rgbaAlpha[1]) >= 1;
  }

  const surfaceObserver = new MutationObserver((records) => {
    for (const record of records) {
      // Stylesheet changes can affect elements outside the changed subtree.
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      queueSurfaces(target?.closest("style, link") ? root : target);
    }
  });

  function observeSurfaces() {
    surfaceObserver.observe(root, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ["class", "style", "hidden", "open", "aria-expanded"]
    });
  }

  function queueSurfaces(element) {
    if (!element || !root.classList.contains("dusk-reader-enabled")) return;
    pendingSurfaces.add(element);
    if (surfaceFrame === null) surfaceFrame = requestAnimationFrame(refreshSurfaces);
  }

  function refreshSurfaces() {
    surfaceFrame = null;
    if (!root.classList.contains("dusk-reader-enabled")) {
      pendingSurfaces.clear();
      return;
    }
    // Disconnect so our own measurement class/markers cannot trigger a loop.
    surfaceObserver.disconnect();
    root.classList.add("dusk-reader-measuring");
    try {
      const elements = new Set();
      for (const subtree of pendingSurfaces) {
        if (!subtree.isConnected) continue;
        elements.add(subtree);
        for (const element of subtree.querySelectorAll("*")) elements.add(element);
      }
      pendingSurfaces.clear();
      const surfaces = [];
      for (const element of elements) {
        const media = element.closest("svg, img, video, canvas, iframe, picture");
        surfaces.push([element, !media && opaqueColor(getComputedStyle(element).backgroundColor)]);
      }
      for (const [element, opaque] of surfaces) element.toggleAttribute(surfaceAttribute, opaque);
    } finally {
      root.classList.remove("dusk-reader-measuring");
      observeSurfaces();
    }
  }

  observeSurfaces();
  // Cover CSS hover/focus states and stylesheets that finish loading later.
  for (const event of ["mouseover", "mouseout", "focusin", "focusout", "transitionend", "animationend"]) {
    document.addEventListener(event, (event) => queueSurfaces(event.target.parentElement || event.target), true);
  }
  document.addEventListener("load", (event) => {
    if (event.target.tagName === "LINK") queueSurfaces(root);
  }, true);
  window.addEventListener("resize", () => queueSurfaces(root));

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
    queueSurfaces(root);
  }

  chrome.storage.local.get(defaultSettings).then(apply);
  darkPreference.addEventListener("change", () => {
    if (currentSettings) apply(currentSettings);
  });
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") chrome.storage.local.get(defaultSettings).then(apply);
  });
})();
