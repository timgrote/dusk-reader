# Dusk Reader

A small, self-owned Chromium extension for making ordinary websites dark. It works in Brave, Chrome, Edge, and other Manifest V3 Chromium browsers. Its dark palette uses the Lupine Omarchy theme's blue accent.

## Privacy and permissions

This extension contains no network requests, telemetry, remote code, trackers, or dependencies. Its only saved data is:

- whether dark mode is globally enabled;
- a list of websites you have opted out of.

The browser will show **"Read and change all your data on all websites"** because an extension must be allowed to alter a page's CSS in order to theme it. All behavior is contained in the five source files in this folder; there is no build step or minified bundle to audit.

## Install in Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this `dusk-reader` folder.
5. Pin **Dusk Reader** from Brave's Extensions menu.

The extension starts enabled. Click its crescent toolbar icon once to toggle dark mode globally: blue means on and gray means off. Right-click the icon (or any page) and choose **Enable/Disable dark mode on _site_** to make a per-site exception. Reload a page if it was already open when you installed the extension.

## Limits

This is a deliberately simple stylesheet-based darkener, rather than Dark Reader's sophisticated per-site dynamic color engine. Some complex sites may need to be excluded, and browser-internal pages, the Chrome Web Store, PDF viewer, and protected pages cannot be modified by any regular extension.

## Inspect or modify

Edit the source files directly, then click Reload on `brave://extensions` and refresh the target tab. The extension uses Manifest V3, `chrome.storage.local`, and the browser's local context-menu API.
