// StepLight parser: turns a messy brain dump into a clean task list.
// Pure functions, no DOM, so they can be unit-tested in Node.
(function (root) {
  'use strict';

  const BULLET = /^\s*(?:(?:[-*•·>]+|\d{1,3}[.)]|\(?[a-z]\)|\[[ xX]?\])\s*)+/;
  const DONE_BOX = /^\s*(?:[-*]\s*)?\[[xX]\]/;
  const SPLITTERS = /\s*(?:;|\s\+\s|,\s*(?:and\s+)?then\s+|\band then\b|\bthen\b(?=\s+\w+\s))\s*/i;

  const DAY_WORDS = ['today', 'tonight', 'tomorrow', 'mon', 'monday', 'tue', 'tues', 'tuesday', 'wed', 'wednesday',
    'thu', 'thur', 'thurs', 'thursday', 'fri', 'friday', 'sat', 'saturday', 'sun', 'sunday'];
  const DUE = new RegExp('\\b(?:by|due|before|until)\\s+(' + DAY_WORDS.join('|') +
    '|\\d{1,2}[/.-]\\d{1,2}|\\d{1,2}(?:am|pm)|noon|eod|end of (?:day|week))\\b', 'i');
  const URGENT = /(!{2,}|\burgent\b|\basap\b|\bimportant\b)/i;

  function clean(s) {
    return s.replace(BULLET, '').replace(/\s+/g, ' ').replace(/^[,.;:\s]+|[,;:\s]+$/g, '').trim();
  }

  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

  // Returns [{ text, due, urgent }]. Completed checkboxes are skipped, duplicates removed.
  function parseDump(raw) {
    if (typeof raw !== 'string') return [];
    const out = [];
    const seen = new Set();
    for (const line of raw.replace(/\r/g, '').split('\n')) {
      if (!line.trim() || DONE_BOX.test(line)) continue;
      for (const part of line.split(SPLITTERS)) {
        const text = clean(part);
        if (text.length < 2) continue;
        const key = text.toLowerCase().replace(/[^a-z0-9぀-鿿]+/g, '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const m = text.match(DUE);
        out.push({ text: cap(text.slice(0, 200)), due: m ? m[1].toLowerCase() : null, urgent: URGENT.test(text) });
      }
    }
    return out;
  }

  // Order suggestion: urgent first, then anything with a due word, then the person's own order.
  // Stable, and never hides a task.
  const DAY_RANK = { today: 0, tonight: 0, eod: 0, noon: 0, tomorrow: 1 };
  function suggestOrder(tasks) {
    return tasks
      .map((t, i) => ({ t, i, r: (t.urgent ? 0 : 10) + (t.due == null ? 5 : (DAY_RANK[t.due] ?? 3)) }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map(x => x.t);
  }

  // Starter steps: the smallest physical action that begins a task. Rule based, so it is predictable.
  const STARTERS = [
    [/\b(email|e-mail|reply|message|text|dm|write to)\b/i, 'Open the message and write only the first line.'],
    [/\b(call|phone|ring)\b/i, 'Find the number and put it on the screen.'],
    [/\b(essay|report|write|draft|paper|letter|cover letter)\b/i, 'Open a blank page and write the title and one sentence.'],
    [/\b(read|chapter|article|review)\b/i, 'Open it and read only the first page or section.'],
    [/\b(study|revise|exam|test|quiz)\b/i, 'Pick one topic and write three things you already know about it.'],
    [/\b(clean|tidy|wash|laundry|dishes)\b/i, 'Set a 5 minute timer and clear one surface.'],
    [/\b(buy|order|shop|groceries)\b/i, 'Write the list of what to get.'],
    [/\b(book|schedule|appointment|register|sign up|apply|form)\b/i, 'Open the page or form and fill in only your name.'],
    [/\b(pay|bill|invoice|tax)\b/i, 'Find the bill and note the amount and the date it is due.'],
    [/\b(slides|presentation|deck)\b/i, 'Write the titles of the first three slides.'],
    [/\b(code|bug|fix|deploy|build)\b/i, 'Reproduce the problem once and write down what you saw.'],
  ];
  function starterStep(text) {
    for (const [re, step] of STARTERS) if (re.test(text)) return step;
    return 'Spend 2 minutes on it. Stopping after that is allowed.';
  }

  const api = { parseDump, suggestOrder, starterStep };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StepLightParse = api;
})(typeof self !== 'undefined' ? self : this);
