# Inbox

Geometry, constants and edge rules of the Inbox sidebar (`t3-inbox`) and its Snooze menus. The [RECIPE](../../../RECIPE.md) says what the Inbox is and how it behaves; shared sizes are in [t3-tokens](../t3-tokens.md); the hover details card and space marks are in [sidebar](sidebar.md).

## Top row and filter

- 32px row, 8 in: Search, then the space filter, New space and New tab in… (touching 28px buttons, 16px icons). Search and the button group are 4 apart, as T3 (t3-tokens「有意不同」). 8 below the row, the cards start.
- The Search input stays in the top row. A query matches a card's displayed title and, when available, its own pane's branch, without regard to case. Rank by text relevance, favoring exact names and word matches over partial matches. The query is plain text, with no field prefixes or cross-field AND filtering. No conversation or terminal contents are read. Go to is still a separate global shortcut.
- Search scoped cards, including folded shelves and Settled cards beyond the first page, but not terminals without Inbox cards. Results replace the normal list with compact, single-line rows: 36px high, 1 apart, rounded 6, with a 16px space mark beside the title and an age at the right. No card actions, shelf headers, pagination, dragging, or sweeps. The normal folds, page and terminal order are unchanged.
- A new query highlights the first result. Pointer movement and Up/Down move the same highlight with the normal selected row background; arrows wrap and reveal the highlighted result. If that result disappears, the first result is highlighted instead. Enter or a click opens the result and clears the query. Esc with a query and the clear button clear only the query and keep the input. Navigation from elsewhere does not clear search; the route reveal waits for the normal list to return. The query is not saved.
- The filter is a 288px combobox under its button's left edge: radius 8, inset 4, a 26px search over a rule, 32px rows of radius 4. It lists `All spaces` and non-Home spaces that currently hold at least one unscoped Inbox entry (`every` or mod cards) or remain selected in `scope`. With more than one machine listed (as Agents' filter, `machine.js`), rows for All machines, This computer and each machine come first, marked by a `server` icon; a pick sets `machine` in localStorage, keeps the menu open, and limits both the cards and the space rows to that machine. A mod card's machine is its space's. Filtered to a machine and no space, the button is `compact` with the machine's name in `accent`. An unlisted machine reads as all and stays stored; a route reveal outside it clears it, as with `scope`.
- If the space filter leaves no cards, the empty state offers Show all spaces. It clears the stored space scope and resets the normal Settled page without switching terminals. An empty query result is not itself a reason to clear scope, and a shelf with cards does not count as empty.

## Shelves

- Pinned and Active cards occupy the top. Working, Snoozed and Settled are bottom-anchored folded shelves when they have entries; when space runs out they follow the cards in the same scrolling list.
- Header: 32px, 2px further out than the rows, padding 8, a dim 12px label, a normal-weight count and a 12px chevron. Shelf chevrons switch direction directly (no cross-fade).
- A folded shelf still shows the row in view, and leaves it out of the hidden count. The row in view also stays visible beyond the Settled page.
- Settled pages with Show more. A Settle can appear on the shelf immediately; ending settled processes belongs to [Clean up](dialogs.md#clean-up).

## Cards

- Radius 6, padding 8. Lines 20/20/16 with gaps 4/2: 78px with all three. Cards 5 apart.
- Line 1: space mark and name; at the right the state or time: Working with its duration, Failed, Approval, Input, Needs you, Done, otherwise age. Line 2: the agent's title. Optional line 3: branch, truncated in the middle, preceded by a 14px `FolderGit2` icon for a verified linked worktree.
- The program icon (60%) and the remote-machine mark end the metadata line, else the title line.
- Titles of the viewed, needs-you and done agents are medium `foreground`; others normal `muted`, brightened on hover. Hover never moves anything.
- Working cards are 70% until hovered or viewed.
- A pinned card shows a pin after its space mark.

### Attention

- The blocked corner says Failed for the card's own terminal error, or Approval / Input for its own current `blocked` report with kind `permission` / `question`. Otherwise it says Needs you. The corner is display only; the existing tree rules still govern attention, Settle and Snooze.
- Hover details say Error occurred if the card's own current error report has a message, as in T3's generic error notice. They do not show report text.

### Checkout context

- Full cards with a branch look up their own terminal pane's live working directory. Show the icon only for a verified linked checkout. Its tooltip alone says `Worktree: <checkout directory name> (<branch>)`, matching T3's path formatting. A branchless checkout has no Worktree row or tooltip; slim rows retain ordinary details.
- Run read-only Git off the draw path, at most one lookup stream per machine, with a 4s timeout per command. Cache directory identity by machine and cwd, and checkout membership by machine and Git common directory, for 60s in memory. Re-read only on demand; compact Search results request no lookups. Disconnect invalidates that machine, and results from a no-longer-requested directory must not decorate its replacement.

## Slim rows (Settled, Snoozed)

- 36px, radius 6, 1 apart: a 16px space mark (40% until lit), the title, then elapsed or remaining time.
- Hover replaces the time with Un-settle or Wake. Snoozed rows show an `accent` alarm clock; `Woke` is `blocked` text and stays beside the hover controls.
- Controls replace the status corner by a cross-fade, never a reflow.

## Ordering

- Active: blocked first whatever their age, then by when the work returned to the person, ties by address.
- Working: by run start. Settled: by Settle time. Snoozed: soonest wake first.
- A finished run stays in Working for 2s, so quick continuations don't flicker. Blocked leaves at once; pinned and settled agents skip the grace.
- Looking at a card never reorders it.

## Settle details

- The standalone `t3-inbox.settle` command reads the current Inbox model when it arrives, even before the first draw. It targets the card in view then: Un-settle if settled, Settle if finished, no Settle while busy. Button and drag actions still target their own rows. The layout's key stays with `t3-tabs` so it also works with the sidebar hidden.
- Settle is offered on hover of any finished card, pinned ones too. It removes the pin, writes the terminal label (`settled=<ms>:<turn>`, see [storage](../storage.md)) and moves the agent into Settled.
- A Settle waiting for the core's echo can't be lifted or settled again.
- Explicit returns go to the top of Active: the Settle key on a settled viewed agent, the Un-settle arrow, dragging it out. Clearing the label any other way keeps its place.
- Undo restores the old position, labels and original pin position, keeping pins added since. A refused Settle also puts its pin back.

## Pins

- One hand-made order, shared with Agents (`shared/pins.js`). Button and menu pins go to the top; dragging picks the place. Pinning ends Snooze.
- Pinned agents stay at the top whatever their state.
- Unpin returns the agent to its time slot and offers Undo; that Undo restores just the pin in its place and writes no terminal label.
- The card's pin is a 16px button holding a 12px icon. Hover or keyboard focus changes it to `pin-off`; click or Enter unpins without opening or lifting the card.

## Undo notice

- `Settled, ⇧⌘Z to undo`, `Snoozed, …`, `Unpinned, …`, with a count for a batch, in the footer's free space for 5s, fading over 200ms. With the sidebar hidden it shows in the tab bar.
- When short of room, the summary is hidden whole and Undo stays (never truncated to `…`). Repeats of the same action combine into one notice.
- Undo restores state; it doesn't count as new work. While still on the Home that action reached, Undo also returns to an agent that was in view when it was put away; one put away in the background stays where it is, and after going elsewhere Undo doesn't navigate.
- Undo's key is `cmd-shift-z` (`t3-tabs.undo`), written in the button as T3's `threadUndoLabel` does (`undoLabel` in `shared/tip.js`, read from the bindings; plain `Undo` with none bound, as standalone Inbox), and the button has no tooltip; `cmd-z` belongs to terminals. At Home the Settle key does nothing: Undo has only its own key, as T3's.

## Dragging and sweeps

- Moving 6px lifts an eligible card or slim row. Working cards and a Settle awaiting the core's echo can't lift.
- The lifted copy is `selected` with a shadow, moves only vertically, and keeps the pressed point under the pointer. Its badge previews the drop: Pin, Unpin, Settle, Un-settle or Wake.
- Only while dragging: Pinned and Active headers expand to 24px over 150ms, Settled appears even when empty, target headers and gaps use `accent`.
- Gaps match the destination: a card plus 5px, or a 36px slim row. Empty or folded destinations show a dashed 36px placeholder.
- In Pinned, the drop goes before or after a card by its upper or lower half. Active and Settled keep their own ordering; no manual positions there. Settled's page length stays fixed as entries enter and leave.
- Release inside the sidebar commits the target and never opens the row. Leaving past the top or bottom commits the last target. Leaving by a side, Esc, the row disappearing or the window deactivating cancels. Deactivation cancels sweeps too, even with a valid target at a top or bottom edge.
- The list holds keyboard focus only while dragging, then gives it back to the pane.
- Sweep: press Settle or Un-settle, cross rows of the same section, release to act on the whole run. Wake sweeps the same way.
- Snoozed takes no drops: a drop can't choose a time.

## Motion

- Reordering and section changes animate over 150ms ease-out: moved rows slide from their old place, new ones fade in from 40px above, departing ones fade where they are. Shelf headers, Show more and the empty marker take part.
- No animation while dragging, or for more than 40 simultaneous changes. A drop slides from where it was released.
- Pressed rows use `selected`.

## Snooze menu

- Any card not needing the person offers a clock before Settle: working and pinned included, failed turns excluded. Hover controls stay put while its menu is open.
- Presets: In 1 hour, In 3 hours, This evening (18:00, listed until it has passed), Tomorrow (09:00), Next week (Monday 09:00; on Sunday it reads Tomorrow). Sorted by time, duplicate wake minutes merged. Not configurable.
- Durations start on click. A fixed time that passed since the menu opened is refused.
- At least 160px wide. Right-aligned below the clock if it fits to the clock's left with 5px clearance from the window, otherwise it extends right from the clock.
- The agent menu's Snooze is a submenu with the same presets and Custom, wake time at the right (submenu behaviour in [menus](menus.md#submenus)).

## Custom snooze

- A 384px dialog in the confirmations' shell (t3-tokens「对话框」) with a ruled footer.
- Date and time: 36px calendar cells, past days disabled, arrows move by day and across months, Enter or Space selects; time as `HH:MM`.
- Duration: a nonnegative number with − and + steppers, and a Minutes / Hours / Days select.
- Nonexistent or past times and nonpositive durations are refused inline, keeping the dialog open. Applying rechecks that the agent may still be snoozed.

## Snooze lifecycle

- At confirmation, recheck the agent and its descendants. A blocked tree stays in view. Snooze writes a wake timestamp (`snoozed=<wake-ms>`) and puts a viewed agent away.
- The agent wakes where it was; if a run finished while snoozed, it returns to the top of Active. It carries `Woke` until viewed or clicked with Inbox selected in an active window; a background window can't consume it. A working agent can show `Working` and `Woke` together.
- A blocked report shows it with its attention label for a while without removing the label; answering hides it again.
- Failure in its tree, a new turn given in view, Wake, pin or Settle clears the label. A pinned snooze keeps the pin underneath and returns to it on wake. Undo of Settle restores a snooze only if it hasn't expired.

## Mod cards

- Opt-in only: `shared("<mod>.program") = { icon, tint, name, inbox: true }`. An icon alone doesn't opt in. Title from `<mod>.titles`, state from `<mod>.status`.
- First seen, done and blocked go to the top of Active; working goes to Working.
- The card belongs to the space, not an agent: it lights only when its own pane has focus. Other mod panes light their nearby agent. Nothing in Home gets a card.
- Opting in promises the pane can be closed safely: Settle and close (button or Settle key) closes the pane, with no Settled shelf or Undo, and lands on the preceding tab or the adjacent agent, never Home. A space's last tab asks first.
- No pin, drag or sweep; the space filter applies.

## Reveal the row in view

- An external jump to a space-filtered agent or mod card widens the filter to all spaces and saves it. The first draw and choosing a filter while already viewing an agent leave the filter alone. Lists mode never widens Inbox's filter.
- While the Inbox is visible in the active window, bringing a different agent or mod card into view reveals its row with the smallest scroll needed. A row already under the pointer stays put. This also reaches the row in a folded shelf or past the Settled page without changing the shelf or page.
- Use the same viewport for cards and shelves. Resolve the latest address on the next draw against the viewport's actual direct children, not the agent order. Wheel input, hiding Inbox, switching to Lists, or deactivating or closing the window cancels a queued request before it is sent to the viewport. A sent request is one-shot: redraws and reordering do not pull the view back, and scrolling never takes terminal focus.
