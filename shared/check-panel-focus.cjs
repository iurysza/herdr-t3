// panel-focus.js on a fake layout and clock: a page's timer takes the keyboard once per request, when it's in front and the request is
// its own and fresh; nothing depends on the page being drawn.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const saved = {}, ui = { open: true, page: 'files' };
let now = 1000;
const layout = () => ({ id: 'root', children: [{ id: 'panel', hidden: !ui.open, children: [{ id: 'panel-body', active: ui.page, children: [] }] }] });
const context = vm.createContext({ PANEL_FOCUS: 't3.panelFocus', layout, shared: k => saved[k], Date: { now: () => now } });
vm.runInContext(fs.readFileSync(`${__dirname}/panel-focus.js`, 'utf8').replace(/^import [^;]*;\n/gm, '').replace(/^export /gm, ''), context);
const watch = vm.runInContext('watchPanelFocus', context);
const ticks = [], cx = { timer: { every: (ms, f) => { assert.equal(ms, 100); ticks.push(f); return { cancel() {} }; } }, notified: 0, notify() { this.notified++; } };
const tick = () => ticks.forEach(f => f(cx));
const handle = (lands = true) => ({ focuses: 0, focus() { this.focuses++; }, is_focused() { return lands && this.focuses > 0; } });
const ask = (slot, n) => { saved['t3.panelFocus'] = { slot, n, at: now }; };

const view = {}, h = handle();
watch(view, 'files', cx, () => h);
tick(); assert.equal(h.focuses, 0, 'nothing asked');
ask('mentions', 1); tick(); assert.equal(h.focuses, 0, "another page's request");
ask('files', 2); now += 2000; tick(); assert.equal(h.focuses, 0, 'an old request');

// Its own, in front: taken on the next tick (never inside a draw: only the timer takes it), once, and again for a new request.
ask('files', 3); tick(); assert.equal(h.focuses, 1); assert.equal(cx.notified, 1);
tick(); tick(); assert.equal(h.focuses, 1, 'once per request');
ask('files', 4); tick(); assert.equal(h.focuses, 2, 'a new request, again');

// Not in front yet: it waits, then takes it when shown; a panel put away never gets it, and the request goes stale.
ui.page = 'mentions'; ask('files', 5); tick(); tick(); assert.equal(h.focuses, 2, 'behind another page');
ui.page = 'files'; tick(); assert.equal(h.focuses, 3, 'shown: taken');
ui.open = false; ask('files', 6); tick(); assert.equal(h.focuses, 3, 'panel closed');
ui.open = true; now += 2000; tick(); assert.equal(h.focuses, 3, 'stale by the time it is shown');

// A try that doesn't land is made again on each tick while the request is fresh.
const stubborn = handle(false), view2 = {}; ticks.length = 0; watch(view2, 'files', cx, () => stubborn);
ask('files', 7); tick(); tick(); assert.equal(stubborn.focuses, 2, 'tried again');
assert.equal(view2.panelFocused, undefined);
// The handle is asked for at the time, so a page whose handle depends on what it shows picks the current one.
const a = handle(), b = handle(), view3 = {}; ticks.length = 0; let pick = a; watch(view3, 'files', cx, () => pick);
pick = b; ask('files', 8); tick(); assert.deepEqual([a.focuses, b.focuses], [0, 1]);
console.log('ok: a panel page takes the keyboard once per request, from its own timer, when in front');
