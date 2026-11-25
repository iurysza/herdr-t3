// panel.js on a fake layout: what each space's panel shows as its tabs come and go, and which repository Review reads.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const saved = {}, ui = { open: false, page: 'panel-empty', wide: false, space: 'a', slots: ['files', 'review', 'panel-empty'], end: 28, buttons: false, panelSize: { px: 540 } };
const machines = { a: null, b: null, home: null, far: 'devbox' };
let cwd = {}, repos = {}, spaceReads = 0;
const ran = [];
const layout = () => ({ id: 'root', children: [{ id: 'work', hidden: ui.wide, children: [{ id: 'window-end', size: { px: ui.end } }] }, { id: 'panel', hidden: !ui.open, size: { ...ui.panelSize }, children: [{ id: 'panel-body', active: ui.page, children: ui.slots.map(id => ({ id })) }] }] });
const context = vm.createContext({ KEY: { panels: 't3.panels' }, GROUP_GAP: 4, layout, Map, Date, Math, window: () => ({ buttons: ui.buttons }),
  spaces: () => (spaceReads++, Object.keys(machines)).map(id => ({ id, active: id === ui.space, folder: '/space', machine: machines[id], tabs: [{ id: `${id}-tab`, active: true }] })),
  focused: () => cwd[ui.space] && !ui.inPanel ? { space: ui.space, tab: `${ui.space}-tab`, pane: `${ui.space}-p`, terminal: `${ui.space}-t` } : ui.inPanel ? { space: ui.space, tab: `${ui.space}-tab`, pane: null, terminal: null } : null,
  panes: () => Object.entries(cwd).map(([s, dir]) => ({ tab: `${s}-tab`, pane: `${s}-p`, terminal: `${s}-t`, cwd: dir, focused: false })),
  exec: async (_cmd, args, { cwd: dir }) => { const root = Object.keys(repos).find(r => dir === r || dir.startsWith(r + '/')); return root ? { code: 0, stdout: root + '\n' } : { code: 128, stdout: '' }; },
  shared: k => saved[k], setShared: (k, v) => { saved[k] = v; },
  run: (cmd, a = {}) => { if (cmd === 'pane.focus') ran.push(a.pane); else if (cmd === 'layout.select') ui.page = a.child; else if (cmd === 'layout.resize' && a.id === 'window-end') ui.end = a.px; else if (cmd === 'layout.resize' && a.id === 'panel') ui.panelSize = a.weight != null ? { weight: a.weight } : { px: a.px }; else if (a.id === 'panel') ui.open = cmd === 'layout.show'; else if (a.id === 'work') ui.wide = cmd === 'layout.hide'; },
});
// Each step that shows or hides the panel sizes the tab bar's window part for that state in the same go (t3-tabs draws the
// closed panel's toggle after Details (P3), then the window's buttons; nothing while the panel is open): the frame that
// shows the change has Details and the toggle where they end up. Checked at every step below.
const endFits = () => assert.equal(ui.end, ui.open ? 0 : 4 + 28 + (ui.buttons ? 8 + 3 * 28 : 0), `window-end for a panel ${ui.open ? 'open' : 'closed'}`);
for (const f of ['terminal-context.js', 'surfaces.js', 'panel.js']) vm.runInContext(fs.readFileSync(`${__dirname}/${f}`, 'utf8').replace(/^import [^;]*;\n/gm, '').replace(/^export /gm, ''), context);
const p = vm.runInContext('({ toggleEnter, enterPanel, leavePanel, stepSurface, hidePanel, panelState, showPage, openFile, closeSurface, togglePanel, toggleWide, restorePanel, syncPanel, activateSurface, resetFilesTabs, reviewRepo, openReview, reviewShown, surfacesFor })', context);
for (const k of ['showPage', 'openFile', 'closeSurface', 'togglePanel', 'toggleWide', 'restorePanel', 'syncPanel', 'activateSurface']) { const f = p[k]; p[k] = (...a) => { const r = f(...a); endFits(); return r; }; }
const tabs = () => p.panelState().tabs.map(t => (t.id === p.panelState().active ? '*' : '') + t.id).join(' ');

(async () => {
  // First open: the empty page, no tabs. Files, two files, the first again: two tabs. Review: its own slot.
  p.togglePanel(); assert.deepEqual([ui.open, ui.page, tabs()], [true, 'panel-empty', '']);
  p.showPage('files'); p.openFile('a.js'); p.openFile('b.js'); p.openFile('a.js');
  assert.deepEqual([ui.page, tabs()], ['files', '*file:a.js file:b.js']);
  p.showPage('review'); assert.deepEqual([ui.page, tabs()], ['review', 'file:a.js file:b.js *review']);
  // Its tab picked again: shown, and revealed again.
  p.activateSurface('file:b.js'); p.activateSurface('file:b.js');
  assert.equal(p.panelState().tabs[1].reveal, 2);
  // Hidden: the tabs stay, wide goes. Widening switches the px panel to weight: 1 so it fills the work area, and restoring puts back its dragged px width.
  ui.panelSize = { px: 620 };
  p.toggleWide(); assert.deepEqual([ui.wide, ui.panelSize], [true, { weight: 1 }], 'widening fills the work area');
  p.toggleWide(); assert.deepEqual([ui.wide, ui.panelSize], [false, { px: 620 }], 'restoring keeps the dragged px width');
  p.toggleWide(); p.togglePanel(); assert.deepEqual([ui.open, ui.wide, ui.panelSize], [false, false, { px: 620 }]);
  p.togglePanel(); assert.deepEqual([ui.open, ui.wide, ui.page, tabs()], [true, false, 'files', 'file:a.js *file:b.js review']);
  p.closeSurface('file:a.js', 'all'); assert.deepEqual([ui.open, tabs()], [false, '']);
  p.togglePanel(); assert.deepEqual([ui.open, ui.page], [true, 'panel-empty']);
  // Each space keeps its own, wide too; a new one starts closed and empty.
  p.showPage('files'); p.openFile('a.js'); p.toggleWide();
  const view = {}; p.syncPanel(view);
  ui.space = 'b'; p.syncPanel(view); p.syncPanel(view); assert.deepEqual([ui.open, ui.wide, ui.panelSize, tabs()], [false, false, { px: 620 }, '']);
  ui.space = 'a'; p.syncPanel(view); p.syncPanel(view); assert.deepEqual([ui.open, ui.wide, ui.panelSize, ui.page, tabs()], [true, true, { weight: 1 }, 'files', '*file:a.js']);
  // Settled on a space, the keys copy's draw reads spaces() once: it draws on every change, and each read copies every space.
  spaceReads = 0; p.syncPanel(view);
  assert.equal(spaceReads, 1, `${spaceReads} reads of spaces() for a draw that changes nothing`);
  // Fast there and back, before the layout's clicks land: what shows isn't recorded as a choice.
  ui.space = 'b'; p.syncPanel(view); ui.space = 'a'; p.syncPanel(view); p.syncPanel(view);
  assert.deepEqual([ui.open, ui.wide], [true, true]); assert.equal(saved['t3.panels'].a.wide, true);
  // Home: laid out with the select that shows it, kept while spaces() still lists the old space.
  p.restorePanel(view, 'home'); p.syncPanel(view); assert.equal(ui.open, false); assert.equal(saved['t3.panels'].a.open, true);
  ui.space = 'home'; p.syncPanel(view); ui.space = 'a'; p.syncPanel(view); p.syncPanel(view); assert.deepEqual([ui.open, tabs()], [true, '*file:a.js']);
  // The model can skip Home and report a third space. It is not the source, even within the arrival grace period.
  saved['t3.panels'].b = { open: true, active: 'review', wide: false, tabs: [{ id: 'review', born: 1 }] };
  p.restorePanel(view, 'home'); p.syncPanel(view);
  ui.space = 'b'; p.syncPanel(view);
  assert.deepEqual([ui.open, ui.page, ui.wide], [true, 'review', false], 'restore a third space without waiting for Home');
  assert.equal(saved['t3.panels'].a.wide, true, 'preparing Home did not change the source record');
  // An older build's record: its page isn't a tab; its fields go at the first write.
  saved['t3.panels'].b = { open: true, page: 'review', wide: false, selected: 'x' }; ui.space = 'b';
  assert.equal(tabs(), ''); p.showPage('files'); assert.deepEqual(Object.keys(saved['t3.panels'].b).sort(), ['active', 'open', 'tabs', 'wide']);
  // Review reads where the tab works: the last terminal's repository, though the space's folder is none.
  ui.space = 'a'; repos = { '/work/repo': true }; cwd = { a: '/work/repo/sub' };
  assert.deepEqual({ ...await p.reviewRepo() }, { root: '/work/repo', problem: '' });
  cwd = {}; assert.match((await p.reviewRepo()).problem, /not in a Git repository/);
  repos = { '/space': true }; assert.equal((await p.reviewRepo()).root, '/space', 'no terminal: the space folder');
  assert.match((await p.reviewRepo('far')).problem, /remote/);
  // An outside pick opens Review for its source only, then names the live tab in the request.
  const pick = { space: 'a', root: '/work/repo', page: '/worktree', analyze: true };
  const prior = saved.review = { n: Date.now() + 5000 }, laid = () => JSON.stringify([ui, saved['t3.panels']]);
  ui.space = 'b'; const other = laid();
  assert.equal(p.openReview(pick), 'stale');
  assert.deepEqual([laid(), saved.review], [other, prior]);
  ui.space = 'a'; ui.slots = ['files', 'panel-empty']; const unavailable = laid();
  assert.equal(p.openReview(pick), 'unavailable');
  assert.deepEqual([laid(), saved.review], [unavailable, prior]);
  ui.slots.push('review');
  assert.equal(p.openReview(pick), 'opened');
  assert.deepEqual([ui.open, ui.page], [true, 'review']); endFits();
  const born = p.panelState().tabs.find(t => t.id === 'review').born;
  assert.deepEqual({ ...saved.review }, { space: 'a', root: '/work/repo', page: '/worktree', n: saved.review.n, analyze: true, born });
  assert.ok(saved.review.n > prior.n);
  // What Review showed counts only while the tab that showed it is there: closed and added again, it's gone.
  saved['review.shown'] = { a: { root: '/work/repo', page: '/worktree', born } };
  assert.equal(p.reviewShown('a')?.page, '/worktree');
  p.closeSurface('review'); p.showPage('review');
  assert.notEqual(p.panelState().tabs.find(t => t.id === 'review').born, born);
  assert.equal(p.reviewShown('a'), null);
  // With the window's own buttons (Windows, Linux) the closed part is wider; open, the panel head has them.
  ui.buttons = true; p.togglePanel(); p.togglePanel(); ui.buttons = false; p.togglePanel(); p.togglePanel();
  // Root change resets file/folder tabs for that space while keeping Review and falling back to generic Files.
  {
    ui.space = 'a';
    saved['t3.panels'].a = { open: true, wide: false, active: 'file:a.js', tabs: [{ id: 'file:a.js', path: 'a.js', born: 1 }, { id: 'file:src', path: 'src', folder: true, born: 2 }, { id: 'review', born: 3 }] };
    assert.equal(p.resetFilesTabs('a'), true);
    assert.deepEqual([...saved['t3.panels'].a.tabs.map(t => t.id)], ['review', 'files']);
    assert.equal(saved['t3.panels'].a.active, 'files');
    assert.equal(p.resetFilesTabs('a'), false, 'no-op once already clean');
    // Preserves active Review tab while still pruning stale file tabs.
    saved['t3.panels'].a = { open: true, wide: false, active: 'review', tabs: [{ id: 'file:a.js', path: 'a.js', born: 4 }, { id: 'review', born: 5 }] };
    assert.equal(p.resetFilesTabs('a'), true);
    assert.deepEqual([...saved['t3.panels'].a.tabs.map(t => t.id)], ['review']);
    assert.equal(saved['t3.panels'].a.active, 'review');
  }
  // Herdr's own layout docks Review in its stack: a page shown, the panel put away; no tabs kept.
  ui.slots = ['review']; ui.open = false; ui.space = 'b'; const before = JSON.stringify(saved['t3.panels'].b);
  assert.equal(p.openReview({ ...pick, space: 'b' }), 'opened');
  assert.deepEqual([ui.open, ui.page, saved.review.space, 'born' in saved.review], [true, 'review', 'b', false]);
  p.togglePanel('review'); assert.equal(ui.open, false);
  p.showPage('review'); p.closeSurface(); assert.equal(ui.open, false);
  assert.equal(JSON.stringify(saved['t3.panels'].b), before);
  // Mentions, where a layout puts it in panel-body's stack: its own tab and slot, kept only while that slot is there.
  ui.slots = ['files', 'mentions', 'panel-empty']; ui.space = 'home'; ui.open = false;
  p.showPage('mentions'); assert.deepEqual([ui.open, ui.page, tabs()], [true, 'mentions', '*mentions']);
  assert.equal(p.surfacesFor('home', ['files', 'mentions', 'panel-empty']).tabs.map(t => t.id).join(' '), 'mentions');
  assert.equal(p.surfacesFor('home', ['files', 'panel-empty']).tabs.map(t => t.id).join(' '), '');
  // The keys that take the keyboard in (⌘2 on Mentions, ⌃Tab in the panel): the page shown and asked for the keyboard, the next
  // tab each press, wrapping, and putting the panel away from inside it gives the terminal it came from the keyboard back.
  {
    const q = () => saved['t3.panelFocus'], enter = () => saved['t3.panels'].home;
    ui.space = 'home'; ui.slots = ['files', 'mentions', 'panel-empty']; ui.open = false; delete saved['t3.panels'].home; cwd = { home: '/work' }; ran.length = 0;
    assert.equal(p.enterPanel('mentions'), true);
    assert.deepEqual([ui.open, ui.page, tabs(), q().slot], [true, 'mentions', '*mentions', 'mentions']);
    assert.ok(q().n > 0 && q().at > 0 && Date.now() - q().at < 1000, 'a request that says when');
    const first = q().n; p.enterPanel('mentions'); assert.ok(q().n > first, 'asked again: a new request, past the last');
    // Files' tabs and Mentions share one strip: ⌃Tab steps through it, the last back to the first, each asking for its slot.
    p.showPage('files'); p.openFile('a.js'); p.enterPanel('mentions');
    assert.equal(tabs(), '*mentions file:a.js');
    assert.equal(p.stepSurface(1), true); assert.deepEqual([ui.page, tabs(), q().slot], ['files', 'mentions *file:a.js', 'files']);
    p.stepSurface(1); assert.deepEqual([ui.page, tabs(), q().slot], ['mentions', '*mentions file:a.js', 'mentions'], 'after the last is the first');
    p.stepSurface(-1); assert.deepEqual([ui.page, tabs()], ['files', 'mentions *file:a.js'], 'before the first is the last');
    p.stepSurface(-1); assert.equal(ui.page, 'mentions');
    // One tab, a closed panel, nothing to step to: it stays put and asks for nothing.
    const asked = q().n; p.closeSurface('file:a.js'); assert.equal(tabs(), '*mentions');
    assert.equal(p.stepSurface(1), false); assert.equal(q().n, asked);
    p.hidePanel(); assert.equal(p.stepSurface(1), false);
    // No such page in this layout: nothing opens, nobody is asked.
    ui.slots = ['files', 'panel-empty']; ui.open = false; const before = q().n; assert.equal(p.enterPanel('mentions'), false);
    assert.deepEqual([ui.open, q().n], [false, before]);
    // ⌘2 is one toggle keyed off what the panel shows, not off who holds the keyboard: closed or on another page it opens Mentions and
    // asks for the keyboard; already on Mentions it puts the panel away and the terminal gets the keyboard back.
    ui.slots = ['files', 'mentions', 'panel-empty']; ui.open = false; ran.length = 0; ui.inPanel = false; cwd = { home: '/work' };
    assert.equal(p.toggleEnter('mentions'), true); assert.deepEqual([ui.open, ui.page, q().slot], [true, 'mentions', 'mentions']);
    const asked2 = q().n; ui.inPanel = true;
    assert.equal(p.toggleEnter('mentions'), true); assert.deepEqual([ui.open, ran], [false, ['home-p']]); assert.equal(q().n, asked2, 'closing asks for nothing');
    ui.inPanel = false; p.toggleEnter('mentions'); assert.equal(ui.open, true);
    p.showPage('files'); assert.deepEqual([ui.open, ui.page], [true, 'files']);
    assert.equal(p.toggleEnter('mentions'), true); assert.deepEqual([ui.open, ui.page, q().slot], [true, 'mentions', 'mentions'], 'open on another page: selects Mentions');
    p.hidePanel(); ui.slots = ['files', 'panel-empty']; assert.equal(p.toggleEnter('mentions'), false, 'no Mentions page here');
    ui.slots = ['files', 'mentions', 'panel-empty']; ran.length = 0;
    // Put away from inside the panel (the focused pane is none there): the terminal it left gets the keyboard, and stays kept
    // beyond the panel's own record; a pane that's gone is replaced by the tab's terminal.
    ui.slots = ['files', 'mentions', 'panel-empty']; ran.length = 0;
    p.enterPanel('mentions'); ui.inPanel = true;
    p.leavePanel(); assert.deepEqual([ui.open, ran], [false, ['home-p']]); endFits();
    saved['t3.panelReturn'] = { pane: 'gone', tab: 'home-tab' }; ran.length = 0; p.leavePanel(); assert.deepEqual(ran, ['home-p']);
    ui.inPanel = false; cwd = {}; ran.length = 0; p.leavePanel(); assert.deepEqual(ran, [], 'no terminal in the tab: nowhere to send it');
    assert.ok(enter().tabs.length > 0);
  }
  // newBorn shares globalThis.t3LastBorn across mod copies, stays strictly > Date.now(), previous t3LastBorn, and existing tab borns.
  {
    const sharedSaved = {}, frozenNow = 10000;
    const sharedUi = { open: false, page: 'panel-empty', wide: false, space: 'a', slots: ['files', 'review', 'panel-empty'], end: 28, buttons: false, panelSize: { px: 540 } };
    const sharedLayout = () => ({ id: 'root', children: [{ id: 'work', hidden: sharedUi.wide, children: [{ id: 'window-end', size: { px: sharedUi.end } }] }, { id: 'panel', hidden: !sharedUi.open, size: { ...sharedUi.panelSize }, children: [{ id: 'panel-body', active: sharedUi.page, children: sharedUi.slots.map(id => ({ id })) }] }] });
    const sharedCtx = vm.createContext({
      KEY: { panels: 't3.panels' }, GROUP_GAP: 4, layout: sharedLayout, Map, Math, Date: { now: () => frozenNow },
      window: () => ({ buttons: sharedUi.buttons }),
      spaces: () => ['a', 'b'].map(id => ({ id, active: id === sharedUi.space, folder: '/space', machine: null, tabs: [{ id: `${id}-tab`, active: true }] })),
      focused: () => null, panes: () => [], exec: async () => ({ code: 128, stdout: '' }),
      shared: k => sharedSaved[k], setShared: (k, v) => { sharedSaved[k] = v; }, run: () => {},
    });
    const modCode = ['terminal-context.js', 'surfaces.js', 'panel.js']
      .map(f => fs.readFileSync(`${__dirname}/${f}`, 'utf8').replace(/^import [^;]*;\n/gm, '').replace(/^export /gm, ''))
      .join('\n');
    vm.runInContext(`(() => {\n${modCode}\nglobalThis.c1 = { showPage, closeSurface, openFile, resetFilesTabs };\n})();`, sharedCtx);
    vm.runInContext(`(() => {\n${modCode}\nglobalThis.c2 = { showPage, closeSurface, openFile, resetFilesTabs };\n})();`, sharedCtx);
    assert.equal(sharedCtx.t3LastBorn, 0);
    sharedCtx.c1.showPage('review');
    const born1 = sharedSaved['t3.panels'].a.tabs.find(t => t.id === 'review').born;
    assert.ok(born1 > frozenNow, `born1 (${born1}) must be strictly > Date.now() (${frozenNow})`);
    sharedCtx.c2.closeSurface('review');
    sharedCtx.c2.showPage('review');
    const born2 = sharedSaved['t3.panels'].a.tabs.find(t => t.id === 'review').born;
    assert.ok(born2 > born1, `second copy at same ms (${born2}) must be > first copy (${born1})`);
    assert.equal(sharedCtx.t3LastBorn, born2);
    // Strictly greater than any existing tab's born in that space even if t3LastBorn is lower.
    sharedCtx.t3LastBorn = 0;
    sharedSaved['t3.panels'].a = { open: true, wide: false, active: 'files', tabs: [{ id: 'files', born: 50000 }] };
    sharedCtx.c1.openFile('x.js');
    const born3 = sharedSaved['t3.panels'].a.tabs.find(t => t.id === 'file:x.js').born;
    assert.equal(born3, 50001);
    // Also respects existing tab born in an explicit non-active space passed to resetFilesTabs(space).
    sharedCtx.t3LastBorn = 0;
    sharedSaved['t3.panels'].b = { open: true, wide: false, active: 'file:y.js', tabs: [{ id: 'file:y.js', path: 'y.js', born: 60000 }] };
    assert.equal(sharedCtx.c1.resetFilesTabs('b'), true);
    assert.equal(sharedSaved['t3.panels'].b.tabs.find(t => t.id === 'files').born, 60001);
  }
  console.log('ok: each space keeps its panel and tabs, hides, widens and restores; Review reads the tab\'s repository; Herdr\'s own stack');
})().catch(e => { console.error(e); process.exit(1); });
