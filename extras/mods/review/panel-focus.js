// The keyboard handed to a panel page (storage.md `t3.panelFocus`): ⌘2, ⌃Tab or a page opening another ask for a page's slot
// (panel.js askPanelFocus), and that page's mod takes the keyboard once it shows. A command would be lost on a hidden copy, which
// hears none, and a render can't be counted on: a hidden copy isn't redrawn when the request is written or when it's shown again.
// Timers do run, so each page watches for its request from init (the hidden-copy pattern of t3-files' own timer).
import { shared, layout } from "herdr";
import { PANEL_FOCUS } from "./panel.js";

// A request older than this is nobody's now. The watch looks this often; a try that doesn't land is made again while it's fresh.
const PANEL_FOCUS_FRESH = 1500, PANEL_FOCUS_TICK = 100;

const findNode = (node, id) => node?.id === id ? node : (node?.children ?? []).reduce((hit, c) => hit ?? findNode(c, id), null);
const slotInFront = (slot) => { const root = layout(), panel = findNode(root, "panel"); return Boolean(panel && !panel.hidden && findNode(root, "panel-body")?.active === slot); };

/** Called from init: this page (`slot`) takes the keyboard for each request made for it, once, when it's in front. `handle()` is
 *  the focus handle to take it with. */
export function watchPanelFocus(view, slot, cx, handle) {
  return cx.timer.every(PANEL_FOCUS_TICK, (cx) => {
    const want = shared(PANEL_FOCUS);
    if (!want || want.slot !== slot || view.panelFocused === want.n || Date.now() - want.at > PANEL_FOCUS_FRESH || !slotInFront(slot)) return;
    const h = handle();
    h.focus();
    if (h.is_focused()) { view.panelFocused = want.n; cx.notify(); }
  });
}
