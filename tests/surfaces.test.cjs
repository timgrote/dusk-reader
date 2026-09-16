const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");

async function page() {
  const elements = [];
  function element(color, media = false) {
    const attributes = new Set();
    const item = {
      nodeType: 1, isConnected: true, color, attributes,
      closest: (selector) => selector.includes("svg") && media ? item : null,
      querySelectorAll: () => [],
      toggleAttribute: (name, enabled) => enabled ? attributes.add(name) : attributes.delete(name)
    };
    elements.push(item);
    return item;
  }
  const root = element("rgb(255, 255, 255)");
  const classes = new Set();
  root.classList = {
    contains: name => classes.has(name),
    add: name => classes.add(name), remove: name => classes.delete(name),
    toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
  };
  root.querySelectorAll = () => elements.slice(1);
  root.style = { setProperty() {}, removeProperty() {} };
  const frames = [];
  let mutation, storageChanged;
  let reads = 0;
  const settings = { enabled: true, disabledSites: [], themeMode: "unknown", themePalette: {} };
  const preference = { matches: true, addEventListener: (_, callback) => preference.changed = callback };
  const documentEvents = {};
  const context = {
    document: { documentElement: root, addEventListener: (name, callback) => documentEvents[name] = callback },
    window: { matchMedia: () => preference, addEventListener() {} },
    location: { hostname: "x.com" },
    MutationObserver: class {
      constructor(callback) { mutation = callback; }
      observe() {} disconnect() {}
    },
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
    getComputedStyle: item => {
      assert.ok(classes.has("dusk-reader-measuring"), "read original backgrounds with overrides suspended");
      reads++;
      return { backgroundColor: item.color };
    },
    chrome: { storage: {
      local: { get: async () => settings },
      onChanged: { addListener: callback => storageChanged = callback }
    } }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../content.js"), "utf8"), context);
  await Promise.resolve();
  return {
    root, element, settings, preference, frames, documentEvents,
    reads: () => reads,
    marked: item => item.attributes.has("data-dusk-reader-surface"),
    mutate: target => mutation([{ target }]),
    flush: () => { while (frames.length) frames.shift()(); },
    save: async () => { storageChanged({}, "local"); await Promise.resolve(); }
  };
}

test("opaque cards darken; transparent, translucent and media backgrounds are preserved", async () => {
  const p = await page();
  const solid = p.element("rgb(255, 255, 255)");
  const transparent = p.element("rgba(0, 0, 0, 0)");
  const scrim = p.element("rgba(0, 0, 0, 0.5)");
  const wideGamut = p.element("color(display-p3 1 1 1)");
  const translucentGamut = p.element("color(display-p3 1 1 1 / 0.5)");
  const image = p.element("rgb(255, 255, 255)", true);
  p.flush();
  assert.equal(p.marked(solid), true);
  assert.equal(p.marked(wideGamut), true);
  for (const item of [transparent, scrim, translucentGamut, image]) assert.equal(p.marked(item), false);
  assert.equal(p.root.classList.contains("dusk-reader-measuring"), false);
});

test("dynamic hover cards and opaque-to-transparent changes are rescanned in a single batch", async () => {
  const p = await page();
  p.flush();
  const card = p.element("rgb(255, 255, 255)");
  p.mutate(card);
  p.mutate(card);
  assert.equal(p.frames.length, 1);
  p.flush();
  assert.equal(p.marked(card), true);
  card.color = "rgba(0, 0, 0, 0)";
  p.documentEvents.mouseout({ target: card });
  p.flush();
  assert.equal(p.marked(card), false);
});

test("light mode/global disable stops styling and scanning; re-enabling rescans", async () => {
  const p = await page();
  p.flush();
  p.preference.matches = false;
  p.preference.changed();
  assert.equal(p.root.classList.contains("dusk-reader-enabled"), false);
  const reads = p.reads();
  p.mutate(p.root);
  p.flush();
  assert.equal(p.reads(), reads);
  p.preference.matches = true;
  p.preference.changed();
  p.flush();
  assert.ok(p.reads() > reads);
  p.settings.enabled = false;
  await p.save();
  assert.equal(p.root.classList.contains("dusk-reader-enabled"), false);
});
