// Loads machine.js: which machines the Agents list offers, and the list scoped to one, an unlisted choice reading as all.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "machine.js"), "utf8").replace(/^export /gm, "")
  + "\nglobalThis.m = { machineOf, machineChoices, activeChoice, scopeAgents, choiceLabel, pick, takePick };", context);
const { machineOf, machineChoices, scopeAgents, choiceLabel, pick, takePick } = context.m;
const plain = (v) => JSON.parse(JSON.stringify(v));

assert.equal(machineOf("t3"), "");
assert.equal(machineOf("vps/t3"), "vps");

const linked = [{ name: null, layout: "ready" }, { name: "vps", layout: "ready" }, { name: "box", layout: "unavailable" }];
const list = [{ address: "t0" }, { address: "vps/t1" }, { address: "pi/t2" }, { address: "t3" }];
assert.deepEqual(plain(machineChoices(linked, list)), ["", "vps", "pi"], "this computer, reachable linked machines, then machines seen in addresses");
assert.deepEqual(plain(machineChoices([{ name: null, layout: "ready" }], [{ address: "t0" }])), [""], "one machine: nothing to choose");

const known = machineChoices(linked, list), addrs = (l) => l.map((a) => a.address);
assert.deepEqual(addrs(scopeAgents(list, null, known)), ["t0", "vps/t1", "pi/t2", "t3"], "null shows all");
assert.deepEqual(addrs(scopeAgents(list, "", known)), ["t0", "t3"], "\"\" shows only this computer's");
assert.deepEqual(addrs(scopeAgents(list, "vps", known)), ["vps/t1"], "a name shows only that machine's");
assert.equal(scopeAgents(list, "box", known), list, "an offline machine reads as all");
assert.equal(scopeAgents(list, "gone", known), list, "a removed machine reads as all");
const lone = [{ address: "t0" }];
assert.equal(scopeAgents(lone, "", [""]), lone, "with one machine the choice does nothing");

assert.deepEqual([null, "", "vps"].map(choiceLabel), ["All machines", "This computer", "vps"]);
// The menu's pick waits once for the list; "" and null are picks too.
assert.equal(takePick(), undefined, "nothing picked");
pick("");
assert.deepEqual([takePick(), takePick()], ["", undefined], "taken once");
pick(null);
assert.equal(takePick(), null, "All machines is a pick");
console.log("ok: machine choices, scoping by machine, unlisted choices reading as all, and the menu's pick handed over once.");
