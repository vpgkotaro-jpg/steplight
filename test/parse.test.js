const test = require('node:test');
const assert = require('node:assert');
const P = require('../parse.js');

test('strips bullets, numbers and checkboxes', () => {
  const r = P.parseDump('- laundry\n2) call mum\n* [ ] buy milk\n• read notes');
  assert.deepStrictEqual(r.map(t => t.text), ['Laundry', 'Call mum', 'Buy milk', 'Read notes']);
});
test('skips finished [x] items and blank lines', () => {
  const r = P.parseDump('- [x] done thing\n\n- [ ] open thing');
  assert.deepStrictEqual(r.map(t => t.text), ['Open thing']);
});
test('splits on semicolons and "then"', () => {
  const r = P.parseDump('read chapter 4, then write the summary; reply to Sam');
  assert.deepStrictEqual(r.map(t => t.text), ['Read chapter 4', 'Write the summary', 'Reply to Sam']);
});
test('does not split ordinary commas', () => {
  const r = P.parseDump('buy eggs, milk and bread');
  assert.strictEqual(r.length, 1);
});
test('removes duplicates', () => {
  assert.strictEqual(P.parseDump('Laundry\nlaundry!\n- laundry').length, 1);
});
test('detects due words and urgency', () => {
  const [a, b, c] = P.parseDump('email Ms. Tan by Fri\nbook dentist!!\nwater plants');
  assert.strictEqual(a.due, 'fri'); assert.strictEqual(b.urgent, true); assert.strictEqual(c.due, null);
});
test('suggestOrder: urgent, then due, then original order, and keeps every task', () => {
  const tasks = P.parseDump('water plants\nessay by tomorrow\nbook dentist!!\nreport by fri\nlaundry');
  const o = P.suggestOrder(tasks).map(t => t.text);
  assert.deepStrictEqual(o, ['Book dentist!!', 'Essay by tomorrow', 'Report by fri', 'Water plants', 'Laundry']);
});
test('starter steps are concrete and have a fallback', () => {
  assert.match(P.starterStep('Email the landlord'), /first line/);
  assert.match(P.starterStep('Write cover letter'), /title/);
  assert.match(P.starterStep('Something unusual'), /2 minutes/);
});
test('lowEnergyStep names the task, keeps it small, and allows stopping', () => {
  const s = P.lowEnergyStep('Write the second paragraph');
  assert.match(s, /^Spend only 2 minutes on: write the second paragraph\. /);
  assert.match(s, /Stopping after that is allowed\.$/);
  assert.match(P.lowEnergyStep('   '), /^Spend only 2 minutes on it\./);
  assert.match(P.lowEnergyStep(null), /Stopping after that is allowed\.$/);
});
test('dayKey uses the local calendar day, so early morning is not the previous day', () => {
  // Local-time constructors make these checks independent of the machine's zone.
  assert.strictEqual(P.dayKey(new Date(2026, 10, 22, 8, 0)), '2026-11-22');
  assert.strictEqual(P.dayKey(new Date(2026, 10, 22, 9, 30)), '2026-11-22');
  assert.strictEqual(P.dayKey(new Date(2026, 10, 22, 0, 30)), '2026-11-22');
  assert.strictEqual(P.dayKey(new Date(2026, 10, 21, 23, 59)), '2026-11-21');
  // A stored ISO timestamp (UTC string) maps back to the same local day it was made on.
  assert.strictEqual(P.dayKey(new Date(new Date(2026, 10, 22, 8, 0).toISOString())), '2026-11-22');
  assert.strictEqual(P.dayKey('not a date'), '');
});
test('handles non-string and empty input', () => {
  assert.deepStrictEqual(P.parseDump(null), []);
  assert.deepStrictEqual(P.parseDump('   \n  '), []);
});
