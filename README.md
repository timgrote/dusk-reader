# Dusk Reader

A small, self-owned Chromium extension for making ordinary websites dark. It works in Brave, Chrome, Edge, and other Manifest V3 Chromium browsers. Without the optional Omarchy bridge, its dark palette uses the Lupine theme's blue accent.

## Privacy and permissions

This extension contains no network requests, telemetry, remote code, trackers, or dependencies. Its only saved data is:

- whether dark mode is globally enabled;
- a list of websites you have opted out of.
- the most recently supplied Omarchy palette, if you install the optional local bridge.

The browser will show **"Read and change all your data on all websites"** because an extension must be allowed to alter a page's CSS in order to theme it. All behavior is contained in the five source files in this folder; there is no build step or minified bundle to audit.

## Install in Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this `dusk-reader` folder.
5. Pin **Dusk Reader** from Brave's Extensions menu.

The extension starts enabled. Click its crescent toolbar icon once to toggle dark mode globally: blue means on and gray means off. Right-click the icon (or any page) and choose **Enable/Disable dark mode on _site_** to make a per-site exception. Reload a page if it was already open when you installed the extension.

## Optional Omarchy integration

When paired with the included Omarchy theme helper, Dusk Reader receives the active Omarchy palette locally. It automatically stays off for themes whose palette declares `mode = "light"`, while preserving your global preference for the next dark theme.

Install the bridge after loading this unpacked extension:

```bash
./bin/install-omarchy-theme-helper
```

The installer copies the included helper scripts to `~/.local/bin/` and registers a Brave native-messaging manifest that allows only this extension ID. It creates no service or daemon. The helper exports the active palette when installed; run `dusk-reader-omarchy-theme-export` after changing themes to refresh it. If you also use the Omarchy theme-rotation plugin, it refreshes the palette automatically. The extension checks that local source once a minute and at browser startup.

## Limits

This is a deliberately simple stylesheet-based darkener, rather than Dark Reader's sophisticated per-site dynamic color engine. Some complex sites may need to be excluded, and browser-internal pages, the Chrome Web Store, PDF viewer, and protected pages cannot be modified by any regular extension.

## Inspect or modify

Edit the source files directly, then click Reload on `brave://extensions` and refresh the target tab. The extension uses Manifest V3, `chrome.storage.local`, local context menus, and (only for the optional bridge) native messaging.
