// The real shared button, rendered at each bar site: clicks, children and platform glyphs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const kit = require("./check-kit.js");
const element = kit.elements(), { find } = kit;
const t = { chrome: "#111111", background: "#222222", dim: "#555555", muted: "#777777", foreground: "#ffffff", hover: "#333333", selected: "#444444" };
const calls = [], space = { id: "s", active: true, tabs: [] }, tab = { id: "b", active: true, named: true, name: "Task" };
let part = { part: "end" }, platform = "windows", panelOpen = false, home = false;
const cx = { notify() {}, stop_propagation() {} };
// Host reads a draw makes: each copies what it returns.
const reads = { layout: 0, panel: 0, home: 0 };
const env = {
  View: class {}, div: element, svg: src => { const e = element(); e.src = src; return e; }, image: element, h_flex: element,
  Popup: { new: (_id, trigger) => element().child(trigger) },
  theme: () => t, props: () => part, settings: () => ({ zoom: 1 }), window: () => ({ platform, buttons: true }),
  spaces: () => [space], agents: () => [], terminals: () => [], panes: () => [], layout: () => { reads.layout++; return {}; }, shared: () => null,
  sidebarParts: () => ({ stack: { active: "lists" } }), toggleLeft: () => 8, panelState: () => { reads.panel++; return { pages: ["files"], page: "files", tabs: [], open: panelOpen }; },
  tip: (_view, _t, _id, _label, el) => el, stop: (_view, _t, _id, el) => el, focusRoot: (_view, el) => el,
  glow: (view, id) => on => { view.hot = on ? id : null; }, within: () => false,
  tipCard: (_t, id) => element().id(id), FADE: {},
  run: (cmd, args) => calls.push([cmd, args]), newTab: s => calls.push(["new", s.id]), togglePanel: () => calls.push(["panel"]),
  toggleWide: () => calls.push(["wide"]), hidePanel: () => calls.push(["hide"]), updates: () => ({ app: {} }), KEY: {}, REVIEW_STATUS: "review.status",
  navigation: () => ({ get atHome() { reads.home++; return home; }, frame: () => ({ tabs: [tab], context: null }) }),
  subAgents: () => () => [], namer: () => p => p.title, programIcon: () => null,
  terminalByAddress: all => new Map(all.map(k => [k.address, k])),
  POINTER_WATCH: 100, pointerAt: () => null, pointerGone: () => false, pointerMoved() {}, pressed() {}, justClosed: () => false,
  openMenu: (_view, kind, target) => calls.push([kind, target]), openOverlay: value => calls.push(["overlay", value]),
};
function load(dir) {
  const scope = vm.createContext({ ...env });
  const { strip } = kit;
  vm.runInContext(`(() => { ${strip(fs.readFileSync(path.join(__dirname, "../../shared/tip.js"), "utf8"))}; globalThis.keptHover = keptHover; })()`, scope);
  vm.runInContext(strip(fs.readFileSync(path.join(__dirname, "../../shared/measured-text.js"), "utf8")), scope);
  vm.runInContext(strip(fs.readFileSync(path.join(__dirname, "../../shared/details.js"), "utf8")), scope);
  vm.runInContext(strip(fs.readFileSync(path.join(__dirname, "../../shared/scroll-strip.js"), "utf8")), scope);
  vm.runInContext(strip(fs.readFileSync(path.join(__dirname, "../../shared/status-mark.js"), "utf8")), scope);
  vm.runInContext(strip(fs.readFileSync(path.join(__dirname, "../../shared/store.js"), "utf8")), scope);
  vm.runInContext(strip(fs.readFileSync(path.join(__dirname, "../../shared/list.js"), "utf8")), scope);
  vm.runInContext('globalThis.namedLabel = named;', scope);
  // The brand bar's Home button, t3-chrome's alone.
  if (fs.existsSync(path.join(dir, "brand.js"))) vm.runInContext(strip(fs.readFileSync(path.join(dir, "brand.js"), "utf8")), scope);
  vm.runInContext("(() => {\n" + strip(["color.js", "button.js", "trigger.js", "tab.js"].map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n")) + "\nglobalThis.tab = tab; globalThis.drawButton = button; globalThis.radiusOf = radiusOf; globalThis.ghostTint = tint; globalThis.GROUP_GAP = GROUP_GAP; Object.assign(globalThis, { trigger, opener, popupOpen, hang });\n})();", scope);
  vm.runInContext(fs.readFileSync(path.join(dir, "main.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Mod = class"), scope);
  return Object.assign(new scope.Mod(), { nameW: {}, tabStrip: {}, surfaceWidths: {}, surfaceStrip: {}, pressed: null, over: null, area: 600 });
}
const click = (root, id) => { const el = find(root, id); assert.ok(el, id); el.handlers.on_click({}, cx); return el; };
const tabs = load(__dirname);
let root = tabs.render();
click(root, "tab-new");
part = { part: "window" };
root = tabs.render();
click(root, "panel-toggle");
for (const id of ["minimize", "maximize", "close-window"]) {
  const el = click(root, id);
  assert.equal(el.style.h, 28); assert.equal(el.style.w, 28); assert.equal(el.items[0].style.size, 16);
}
// Lists' + is the New tab its label's key is: the one command, so the breadcrumb reads the same after either (navigation.js `fresh`).
assert.deepEqual(calls.splice(0), [["t3-tabs.new", undefined], ["panel"], ["window.minimize", undefined], ["window.maximize", undefined], ["window.close", undefined]]);
panelOpen = true;
assert.equal(find(tabs.render(), "close-window"), null, "platform buttons move to the panel head");
assert.equal(find(tabs.render(), "panel-toggle"), null, "open panel owns its rightmost toggle");
panelOpen = false;
// Each part reads only what it draws, once: these are host reads, made again on every draw.
{
  const view = load(__dirname);
  const drawn = (props) => { part = props; for (const k in reads) reads[k] = 0; view.render(); return { ...reads }; };
  assert.deepEqual(drawn({}), { layout: 1, panel: 0, home: 0 }, "the strip: the layout once, nothing of the panel or Home");
  assert.deepEqual(drawn({ part: "end" }), { layout: 1, panel: 0, home: 1 }, "Lists' +");
  assert.deepEqual(drawn({ part: "window" }), { layout: 0, panel: 1, home: 1 }, "the panel's toggle and the window's buttons");
}

// On a Mac only the closed panel's toggle, then the layout's 12, follow Details: Lists' + never pushes it (「规则」R1).
{
  const row = JSON.parse(fs.readFileSync(path.join(__dirname, "../../layouts/herdr-t3.json"), "utf8"));
  const walk = n => n?.id === "tabs-row" ? n : (n?.children ?? []).map(walk).find(Boolean);
  const blocks = walk(row).children, at = blocks.findIndex(b => b.id === "actions");
  const drawn = ["tab-new", "panel-toggle", "minimize", "maximize", "close-window"];
  const wasWindow = env.window, wasParts = env.sidebarParts;
  for (const mode of ["lists", "inbox"]) for (const open of [false, true]) {
    env.window = () => ({ platform: "macos", buttons: false }); env.sidebarParts = () => ({ stack: { active: mode } }); panelOpen = open;
    const view = load(__dirname), ids = list => list.flatMap(b => b.content ? (part = b.content.props, drawn.filter(id => find(view.render(), id))) : []);
    const before = ids(blocks.slice(0, at)), after = ids(blocks.slice(at + 1)), state = `${mode}, panel ${open ? "open" : "closed"}`;
    assert.deepEqual(after, open ? [] : ["panel-toggle"], `only the closed panel's toggle follows Details (${state})`);
    // 4 from Details to the closed panel's toggle, and from Lists' + to Details (P3).
    const lead = (part = { part: "window" }, find(view.render(), "window-end").style.pl ?? 0), trail = (part = { part: "end" }, find(view.render(), "tabs-end").style.pr ?? 0);
    assert.deepEqual([lead, trail], [open ? 0 : 4, mode === "lists" ? 4 : 0], `4 beside Details (${state})`);
    assert.deepEqual(before, mode === "lists" ? ["tab-new"] : [], `Lists' + comes before Details (${state})`);
  }
  env.window = wasWindow; env.sidebarParts = wasParts; panelOpen = false; part = { part: "window" };
}
// The closed panel's toggle ends 12 from the window edge, where the open panel's head puts it (t3-chrome check-surfaces), on
// rows as high, so the 28 buttons share a centre too.
{
  const root = JSON.parse(fs.readFileSync(path.join(__dirname, "../../layouts/herdr-t3.json"), "utf8"));
  const node = (n, id) => n?.id === id ? n : (n?.children ?? []).map(c => node(c, id)).find(Boolean);
  const row = node(root, "tabs-row").children, closed = row.slice(row.findIndex(b => b.id === "window-end") + 1).reduce((sum, b) => sum + b.size.px, 0);
  assert.equal(closed, 12, "the closed panel's toggle, 12 from the window edge");
  assert.equal(node(root, "panel-head").size.px, node(root, "tabs-row").size.px, "the panel head and the tab bar share a centre line");
}
// panel.js sizes the window part as it shows or hides the panel (so that frame has Details where it ends up): the width it
// gives is the width this part draws, each platform, panel open or closed.
{
  const scope = vm.createContext({ layout: () => ({ id: "root", children: [{ id: "panel-body", children: [{ id: "files" }] }] }), window: () => env.window(), GROUP_GAP: 4,
    KEY: { home: "t3-tabs.home" }, shared: k => k === "t3-tabs.home" ? "h" : null, spaces: () => [{ id: home ? "h" : "s", active: true }] });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../shared/panel.js"), "utf8").replace(/^import [^;]*;\r?\n/gm, "").replace(/^export /gm, "") + "\nglobalThis.windowEndPx = windowEndPx;", scope);
  part = { part: "window" };
  const was = env.window;
  for (const atHome of [false, true]) for (const p of ["windows", "macos"]) for (const open of [false, true]) {
    env.window = () => ({ platform: p, buttons: p !== "macos" }); panelOpen = open; home = atHome;
    const el = load(__dirname).render(), drawn = (find(el, "panel-toggle") ? 4 + 28 : 0) + (find(el, "minimize") ? 8 + 3 * 28 : 0);
    assert.equal(scope.windowEndPx(open), drawn, `${p}, panel ${open ? "open" : "closed"}${atHome ? ", at Home" : ""}`);
  }
  // At Home the panel's toggle isn't drawn, as +: the row folds there, too short for it. ⌥⌘B still opens the panel. Window
  // buttons stay, the row not folding while they show.
  panelOpen = false; home = true;
  for (const p of ["macos", "windows"]) {
    env.window = () => ({ platform: p, buttons: p !== "macos" });
    const el = load(__dirname).render();
    assert.equal(find(el, "panel-toggle"), null, `${p}: no panel toggle at Home`);
    assert.equal(Boolean(find(el, "minimize")), p !== "macos", `${p}: window buttons as anywhere`);
  }
  home = false;
  env.window = was;
  panelOpen = false;
}
platform = "linux";
root = tabs.render();
assert.equal(find(root, "minimize").items[0], "−"); assert.equal(find(root, "maximize").items[0], "□");
const toggle = tabs.sidebarToggle(t, () => {});
assert.equal(toggle.style.h, 28); assert.equal(toggle.style.w, 28, "the 28px square, its icon alone"); assert.equal(toggle.items.length, 1);
click(toggle, "sidebar-toggle");
assert.equal(calls.pop()[0], "t3-tabs.toggle-sidebar");
part = {};
tabs.overTab = "tab-b";
root = tabs.render();
const close = click(root, "tab-b-close");
assert.equal(close.style.h, 16); assert.equal(close.items.length, 1); assert.equal(close.items[0].style.size, 12);
assert.equal(close.hoverStyle.bg, t.raised, "as T3's tab close, bg-muted"); assert.equal(calls.pop()[0], "t3-tabs.close-tab:b");
assert.equal(find(root, "tab-b").style.bg, "#ffffff12", "the tab shown: the text color at 7%, as the panel's tabs");
tabs.overTab = null;
assert.notEqual(find(tabs.render(), "tab-b-close").items[0]?.src, "mods/t3-tabs/icons/x.svg", "× shows only while the tab is hovered");
// Move from the name to the icon, rest through the hover watch, then leave without a host leave event.
{
  const bounds = { x: 400, y: 8, width: 150, height: 24 };
  let position = { x: 465, y: 20 }, watch;
  env.window.mouse_position = () => position;
  env.window.viewport_size = () => ({ width: 1000, height: 700 });
  const eventCx = { ...cx, timer: { every(_ms, tick) { watch = tick; return { cancel() {} }; } } };
  const row = () => find(tabs.render(), "tab-b");
  const glyph = () => find(tabs.render(), "tab-b-close").items[0].src;
  row().handlers.on_hover(true, eventCx);
  row().handlers.on_mouse_move({ bounds, position }, eventCx);
  position = { x: 413, y: 20 };
  row().handlers.on_mouse_move({ bounds, position }, eventCx);
  watch(eventCx);
  assert.equal(glyph(), "mods/t3-tabs/icons/x.svg", "moving within a draggable tab keeps × after the watch ticks");
  for (const y of [30, 10]) {
    position = { x: 413, y };
    row().handlers.on_mouse_move({ bounds, position }, eventCx);
  }
  watch(eventCx);
  assert.equal(glyph(), "mods/t3-tabs/icons/x.svg", "stopping near the window edge still inside the tab keeps ×");
  position = { x: 413, y: 40 };
  watch(eventCx);
  assert.notEqual(glyph(), "mods/t3-tabs/icons/x.svg", "leaving restores the glyph even if the host missed leave");
}
// A middle press closes the tab through the same close-tab path as ×, so a running agent still asks first.
root = tabs.render();
[].concat(find(root, "tab-b").handlers["on_mouse_down:middle"]).forEach(f => f({}, cx));
assert.equal(calls.pop()[0], "t3-tabs.close-tab:b", "a middle press closes the tab");

// In Lists a snooze's end brings a tab's done mark back with nothing else changing, so the strip redraws itself then, once.
{
  let now = 1000000, notified = 0, mode = "lists";
  const waits = [], due = () => waits.filter(w => !w.gone).map(w => w.at - now);
  const drawCx = { ...cx, notify() { notified++; }, timer: { after(ms, f) { const w = { at: now + ms, f, cancel() { w.gone = true; } }; waits.push(w); return w; } } };
  const elapse = ms => { now += ms; for (const w of waits.filter(w => !w.gone && w.at <= now)) { w.gone = true; w.f(drawCx); } };
  const clock = { now: () => now }, term = { address: "t1", state: "live", status: "done", labels: {} };
  const tree = vm.createContext({ Date: clock });
  vm.runInContext(kit.strip(fs.readFileSync(path.join(__dirname, "tree.js"), "utf8")) + "\nglobalThis.real = { ownStatus, treeStatus, notNews, subAgents };", tree);
  const was = { ...env };
  Object.assign(env, tree.real, { Date: clock, agents: () => [{ address: "t1", tab: "b", status: "done" }], terminals: () => [term],
    sidebarParts: () => ({ stack: { active: mode } }), stopsEnd() {} });
  const view = load(__dirname), marked = () => kit.walk(find(view.render(drawCx), "tab-b")).some(n => "rounded_full" in n.style);
  for (const k of Object.keys(env)) if (!(k in was)) delete env[k];
  Object.assign(env, was);
  part = {};
  assert.deepEqual([marked(), due()], [true, []], "nothing snoozed: its done shows, and nothing waits");
  term.labels.snoozed = String(now + 60000);
  assert.deepEqual([marked(), due()], [false, [60000]], "snoozed, its done is no news: one redraw waits for the wake");
  view.render(drawCx);
  assert.deepEqual(due(), [60000], "drawn again, the same one");
  elapse(60000);
  assert.deepEqual([notified, marked(), due()], [1, true, []], "the wake redraws, the mark is back, and nothing waits after it");
  term.labels.snoozed = String(now + 60000); view.render(drawCx);
  mode = "inbox"; view.render(drawCx);
  assert.deepEqual(due(), [], "with the Inbox the strip has no marks: nothing to wait for");
  mode = "lists"; view.render(drawCx);
  assert.deepEqual(due(), [60000]);
  view.close();
  assert.deepEqual(due(), [], "closing ends the wait");
}

const chrome = load(path.join(__dirname, "../t3-chrome"));
part = { footer: true };
root = chrome.render();
for (const id of ["settings", "t3-settings"]) assert.equal(click(root, id).style.h, 32);
assert.deepEqual(calls.splice(0).map(c => c[0]), ["app.settings", "t3-tabs.settings"]);
part = {};
root = chrome.render();
for (const id of ["sidebar-toggle", "sidebar-mode"]) assert.equal(click(root, id).style.h, 28);
assert.deepEqual(calls.splice(0).map(c => c[0]), ["t3-tabs.toggle-sidebar", "t3-tabs.sidebar"]);
part = { part: "panel" };
root = chrome.render();
for (const id of ["panel-wide", "panel-close"]) assert.equal(click(root, id).style.h, 28);
assert.deepEqual(calls.splice(0), [["wide"], ["hide"]]);

const pending = [], timedCx = { ...cx, timer: { after(ms, callback) { const task = { ms, callback, cancel() { this.cancelled = true; } }; pending.push(task); return task; }, every() { return { cancel() {} }; } } };
const tick = ms => { const i = pending.findIndex(task => !task.cancelled && task.ms === ms); assert.notEqual(i, -1); pending.splice(i, 1)[0].callback(timedCx); };
const bounds = { x: 10, y: 20, width: 30, height: 24 };
const crumbContext = { space: { id: 's', name: 'Space' }, head: 'agent', parent: 'parent' };
const crumbData = { every: [{ address: 'agent', title: 'Wide title' }, { address: 'parent', title: 'Parent' }], ps: [], name: a => a.title, narrow: false, stopPress() {} };
env.projectMark = () => element();
const crumbs = load(__dirname);
root = crumbs.crumb(t, crumbContext, crumbData);
assert.ok(find(root, 'text-name-peer-agent'), 'the breadcrumb uses the shared measured text');
find(root, 'text-name-peer-agent').handlers.on_size_change({ width: 40 }, cx);
find(root, 'text-measure-peer-agent').handlers.on_size_change({ width: 90 }, cx);
root = crumbs.crumb(t, crumbContext, crumbData);
const title = find(root, 'peer-agent');
title.handlers.on_hover(true, timedCx); assert.equal(crumbs.details, undefined, 'cut names retain the opening delay');
tick(150); tick(34); assert.equal(crumbs.details, 'peer-agent'); assert.equal(crumbs.detailsIn, true, 'the original details timer finishes its fade in');
title.handlers.on_mouse_move({ bounds }); assert.equal(crumbs.detailsBox.key, 'peer-agent'); assert.equal(crumbs.detailsBox.box, bounds);
title.handlers["on_mouse_down:left"]({ bounds }, timedCx); assert.equal(crumbs.details, null, 'press closes the tooltip');
title.handlers.on_click({}, cx);
assert.equal(calls.at(-1)[1].at.x, 10); assert.equal(calls.at(-1)[1].at.y, 48, 'title menu retains its pressed anchor');
title.handlers["on_mouse_down:right"]({}, timedCx); assert.equal(calls.at(-1)[0], 'agent'); assert.equal(calls.at(-1)[1].address, 'agent');
find(root, 'text-name-peer-agent').handlers.on_size_change({ width: 90 }, cx);
root = crumbs.crumb(t, crumbContext, crumbData);
find(root, 'peer-agent').handlers.on_hover(true, timedCx); assert.equal(crumbs.details, null, 'whole titles show no repeated label');
root = crumbs.crumb(t, crumbContext, { ...crumbData, narrow: true });
find(root, 'crumb-parent').handlers.on_hover(true, timedCx); assert.equal(crumbs.details, 'crumb-parent', 'an ellipsis still shows the full parent name');

// bar-measure only writes KEY.compact when the boolean value actually changes.
{
  const wasShared = env.shared, wasSetShared = env.setShared, wasSettings = env.settings, wasPart = part;
  let compactValue = undefined, writes = 0, zoom = 1;
  env.shared = (k) => k === "t3-tabs.compact" ? compactValue : null;
  env.setShared = (k, v) => { if (k === "t3-tabs.compact") { compactValue = v; writes++; } };
  env.settings = () => ({ zoom });
  part = { part: "measure" };
  const measure = load(__dirname);
  const el = find(measure.render(), "bar-measure");
  el.handlers.on_size_change({ width: 900 });
  assert.deepEqual([compactValue, writes], [true, 1], "initial narrow width writes compact=true once");
  el.handlers.on_size_change({ width: 800 });
  assert.deepEqual([compactValue, writes], [true, 1], "still narrow: does not rewrite KEY.compact");
  el.handlers.on_size_change({ width: 1200 });
  assert.deepEqual([compactValue, writes], [false, 2], "crossing >= 1024 writes compact=false once");
  el.handlers.on_size_change({ width: 1300 });
  assert.deepEqual([compactValue, writes], [false, 2], "still wide: does not rewrite KEY.compact");
  zoom = 2;
  el.handlers.on_size_change({ width: 2048 });
  assert.deepEqual([compactValue, writes], [false, 2], "zoomed 2048/2 = 1024 stays false without rewriting");
  el.handlers.on_size_change({ width: 2046 });
  assert.deepEqual([compactValue, writes], [true, 3], "zoomed 2046/2 = 1023 crosses to true");
  env.shared = wasShared; env.setShared = wasSetShared; env.settings = wasSettings; part = wasPart;
}

console.log("ok: tab/window/sidebar and chrome buttons use the real helper and preserve their clicks, counts and platform glyphs.");
