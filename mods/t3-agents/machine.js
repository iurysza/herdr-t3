// Which machine an agent runs on, and the Agents list scoped to one. A choice is null (all machines), "" (this computer) or a
// machine's name.

/** A remote agent's address is `machine/tN`; this computer's has no `/`. @param {string} address */
export const machineOf = (address) => (address.includes("/") ? address.split("/")[0] : "");

/**
 * The machines listed now: this computer first, then each linked one Herdr can reach (`machines()`, its null being this computer),
 * then any only seen in an agent's address.
 * @param {{ name: string | null, layout: string }[]} linked @param {{ address: string }[]} list @returns {string[]}
 */
export function machineChoices(linked, list) {
  const names = new Set([""]);
  for (const m of linked) if (m.name && m.layout !== "unavailable") names.add(m.name);
  for (const a of list) names.add(machineOf(a.address));
  return [...names];
}

/** The choice in effect: a stored one not listed now (offline, removed) reads as all, and stays stored to come back with it.
 *  @param {string | null} choice @param {string[]} known */
export const activeChoice = (choice, known) => (choice != null && known.length > 1 && known.includes(choice) ? choice : null);

/** @template {{ address: string }} A @param {A[]} list @param {string | null} choice @param {string[]} known @returns {A[]} */
export function scopeAgents(list, choice, known) {
  const on = activeChoice(choice, known);
  return on == null ? list : list.filter((a) => machineOf(a.address) === on);
}

/** @param {string | null} choice */
export const choiceLabel = (choice) => (choice == null ? "All machines" : choice === "" ? "This computer" : choice);

// The menu is a popup: a copy with other props, so another localStorage (Herdr shares it only between the same props). Its pick
// waits here, in the module both copies share, for the list to keep.
let picked;
/** @param {string | null} choice */
export const pick = (choice) => { picked = choice; };
/** The pick waiting, once; undefined if none. */
export const takePick = () => { const c = picked; picked = undefined; return c; };
