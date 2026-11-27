(function () {
  'use strict';
  const P = window.StepLightParse;
  const KEY = 'steplight.v1';
  const $ = id => document.getElementById(id);
  const today = () => P.dayKey(new Date());

  const fresh = () => ({ tasks: [], current: null, step: '', doneCount: 0, doneDate: today(), pause: null, log: [],
    settings: { large: false, spacing: false, contrast: false, motion: false, announce: true, chime: false } });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { S = fresh(); }
  if (S.doneDate !== today()) { S.doneCount = 0; S.doneDate = today(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: keep working in memory */ } };
  const uid = () => Math.random().toString(36).slice(2, 10);

  // Screen reader announcements. Clearing first makes repeated messages be read again.
  const live = $('live');
  function say(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60); }

  // ---------- views ----------
  const VIEWS = ['dump', 'pick', 'focus', 'settings'];
  function show(view, opts = {}) {
    for (const v of VIEWS) $('view-' + v).hidden = v !== view;
    document.querySelectorAll('.tab').forEach(b => {
      if (b.dataset.view === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (view === 'pick') renderPick();
    if (view === 'focus') renderFocus();
    if (!opts.keepFocus) {
      if (view === 'focus' && S.current) $('focusStep').focus(); else $('main').focus();
    }
    say({ dump: 'Dump section', pick: 'Pick section. ' + openTasks().length + ' tasks.', focus: S.current ? 'Focus. Next step: ' + S.step : 'Focus section', settings: 'Settings' }[view]);
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => show(b.dataset.goto)));

  const openTasks = () => S.tasks.filter(t => !t.done);
  const task = id => S.tasks.find(t => t.id === id);

  // ---------- dump ----------
  $('sampleBtn').addEventListener('click', () => {
    $('dump').value = '- email Ms. Tan about the group project by Fri\n- read chapter 4, then write the summary\n- laundry\n- [x] return library book\n- book dentist appointment!!\n- revise for the biology quiz by tomorrow\n- reply to Sam; buy printer paper';
    $('dump').focus();
  });
  $('parseBtn').addEventListener('click', () => {
    const parsed = P.parseDump($('dump').value);
    if (!parsed.length) { say('Nothing to add yet. Type at least one task.'); $('dump').focus(); return; }
    const existing = new Set(S.tasks.map(t => t.text.toLowerCase()));
    let added = 0;
    for (const t of parsed) if (!existing.has(t.text.toLowerCase())) { S.tasks.push({ id: uid(), done: false, ...t }); added++; }
    S.tasks = [...P.suggestOrder(openTasks()), ...S.tasks.filter(t => t.done)];
    save();
    $('dump').value = '';
    show('pick');
    say(added + ' tasks added. Suggested order is ready. Pick one.');
  });

  // ---------- pick ----------
  function renderPick() {
    const list = $('taskList');
    list.textContent = '';
    const open = openTasks();
    $('emptyPick').hidden = open.length > 0;
    open.forEach((t, i) => {
      const li = document.createElement('li');
      const go = document.createElement('button');
      go.type = 'button'; go.className = 'go'; go.dataset.id = t.id;
      go.textContent = t.text;
      const extra = [t.urgent ? 'urgent' : '', t.due ? 'due ' + t.due : ''].filter(Boolean).join(', ');
      go.setAttribute('aria-label', (i + 1) + ' of ' + open.length + ': ' + t.text + (extra ? ' (' + extra + ')' : '') + '. Press Enter to start.');
      go.addEventListener('click', () => start(t.id));
      go.addEventListener('keydown', e => {
        const all = [...list.querySelectorAll('.go')];
        const k = all.indexOf(go);
        if (e.key === 'ArrowDown' && all[k + 1]) { e.preventDefault(); all[k + 1].focus(); }
        if (e.key === 'ArrowUp' && all[k - 1]) { e.preventDefault(); all[k - 1].focus(); }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(t.id, k); }
      });
      li.appendChild(go);
      if (t.urgent) li.appendChild(tag('urgent', 'tag urgent'));
      if (t.due) li.appendChild(tag(t.due, 'tag'));
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'rm'; rm.textContent = 'Remove';
      rm.setAttribute('aria-label', 'Remove ' + t.text);
      rm.addEventListener('click', () => remove(t.id, i));
      li.appendChild(rm);
      list.appendChild(li);
    });
  }
  function tag(text, cls) { const s = document.createElement('span'); s.className = cls; s.textContent = text; s.setAttribute('aria-hidden', 'true'); return s; }
  function remove(id, index) {
    const t = task(id);
    S.tasks = S.tasks.filter(x => x.id !== id);
    if (S.current === id) { S.current = null; S.step = ''; }
    save(); renderPick();
    const all = [...$('taskList').querySelectorAll('.go')];
    (all[Math.min(index, all.length - 1)] || $('addInput')).focus();
    say('Removed ' + (t ? t.text : 'task') + '.');
  }
  $('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const parsed = P.parseDump($('addInput').value);
    if (!parsed.length) return;
    for (const t of parsed) S.tasks.push({ id: uid(), done: false, ...t });
    save(); $('addInput').value = ''; renderPick();
    say('Added ' + parsed.map(t => t.text).join(', ') + '.');
  });

  // ---------- focus ----------
  function start(id) {
    const t = task(id);
    if (!t) return;
    S.current = id;
    S.step = P.starterStep(t.text);
    S.pause = null;
    save();
    show('focus');
  }
  function renderFocus() {
    const t = S.current && task(S.current);
    $('emptyFocus').hidden = !!t;
    $('focusBox').hidden = !t;
    if (!t) return;
    $('focusTask').textContent = t.text;
    $('focusStep').textContent = S.step;
    $('doneCount').textContent = S.doneCount;
    $('stepForm').hidden = true; $('pauseForm').hidden = true;
    renderLog();
  }
  // Today's finished steps, so the day can be looked back on, not only counted.
  function renderLog() {
    const list = $('doneLog');
    list.textContent = '';
    const todays = (S.log || []).filter(x => x && P.dayKey(x.at) === today());
    $('logEmpty').hidden = todays.length > 0;
    todays.forEach(x => {
      const li = document.createElement('li');
      const time = new Date(x.at);
      const hh = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
      li.textContent = hh + '  ' + x.step + '  (' + x.task + ')';
      list.appendChild(li);
    });
  }
  // Low-energy day: keep the step to two minutes and start the timer at once.
  $('lowBtn').addEventListener('click', () => {
    const t = S.current && task(S.current);
    if (!t) return;
    S.step = P.lowEnergyStep(t.text); save();
    renderFocus();
    startTimer(2);
    $('focusStep').focus();
    say('Two minutes only. ' + S.step);
  });
  function stepDone() {
    if (!S.current) return;
    const t = task(S.current);
    S.doneCount++;
    if (!Array.isArray(S.log)) S.log = [];
    S.log.push({ task: t ? t.text : '', step: S.step, at: new Date().toISOString() });
    S.log = S.log.slice(-100);
    save();
    $('doneCount').textContent = S.doneCount;
    renderLog();
    $('stepForm').hidden = false; $('pauseForm').hidden = true;
    $('stepInput').value = '';
    $('stepInput').placeholder = 'Next small step, for example: write the second paragraph';
    $('stepInput').focus();
    say('Step done. ' + S.doneCount + ' today. Type the next small step, or choose The whole task is finished when this task is done.');
  }
  function smaller() {
    if (!S.current) return;
    $('stepForm').hidden = false; $('pauseForm').hidden = true;
    $('stepInput').value = '';
    $('stepInput').placeholder = 'e.g. ' + P.starterStep(task(S.current).text);
    $('stepInput').focus();
    say('Make it smaller. What could you start in 10 seconds?');
  }
  function pause() {
    if (!S.current) return;
    $('pauseForm').hidden = false; $('stepForm').hidden = true;
    $('pauseInput').value = '';
    $('pauseInput').focus();
    say('Pause. Write a note to future you.');
  }
  $('doneBtn').addEventListener('click', stepDone);
  $('smallerBtn').addEventListener('click', smaller);
  $('pauseBtn').addEventListener('click', pause);
  $('stepForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('stepInput').value.trim().replace(/\s+/g, ' ');
    if (!v) { say('The step is empty.'); return; }
    S.step = v.slice(0, 160); save();
    renderFocus(); $('focusStep').focus();
    say('Next step: ' + S.step);
  });
  $('stepCancel').addEventListener('click', () => { $('stepForm').hidden = true; $('focusStep').focus(); });
  $('pauseForm').addEventListener('submit', e => {
    e.preventDefault();
    S.pause = { taskId: S.current, step: S.step, note: $('pauseInput').value.trim().slice(0, 400), at: Date.now() };
    save(); stopTimer();
    $('pauseForm').hidden = true;
    say('Saved. When you come back, StepLight will show where you stopped.');
    renderResume();
    show('pick');
  });
  $('pauseCancel').addEventListener('click', () => { $('pauseForm').hidden = true; $('focusStep').focus(); });
  $('taskDoneBtn').addEventListener('click', () => {
    const t = S.current && task(S.current);
    if (!t) return;
    t.done = true; S.current = null; S.step = ''; S.pause = null;
    save(); stopTimer();
    const left = openTasks().length;
    show('pick');
    say('Finished: ' + t.text + '. ' + (left ? left + ' tasks left. Pick the next one when you are ready.' : 'Your list is clear.'));
  });

  // ---------- resume ----------
  function renderResume() {
    const p = S.pause, t = p && task(p.taskId);
    $('resume').hidden = !t;
    if (!t) return;
    $('resumeTask').textContent = t.text + ' (step: ' + p.step + ')';
    $('resumeNote').textContent = p.note || '(no note)';
  }
  $('resumeGo').addEventListener('click', () => {
    const p = S.pause;
    if (!p || !task(p.taskId)) return;
    S.current = p.taskId; S.step = p.step; S.pause = null; save();
    $('resume').hidden = true;
    show('focus');
  });
  $('resumeDismiss').addEventListener('click', () => { $('resume').hidden = true; $('main').focus(); });

  // ---------- timer ----------
  let timer = null, endAt = 0, lastSaid = -1;
  function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function tick() {
    const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    $('timerOut').textContent = fmt(left);
    const min = Math.ceil(left / 60);
    if (S.settings.announce && left > 0 && left % 300 === 0 && min !== lastSaid) { lastSaid = min; say(min + ' minutes left.'); }
    if (left <= 0) {
      stopTimer();
      $('timerOut').textContent = 'Time is up';
      say('Timer finished. Good moment to choose: keep going, make the next step, or pause with a note.');
      if (S.settings.chime) chime();
    }
  }
  function startTimer(min) {
    stopTimer();
    endAt = Date.now() + min * 60000; lastSaid = -1;
    timer = setInterval(tick, 1000); tick();
    $('timerStop').hidden = false;
    say(min + ' minute timer started.');
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; $('timerStop').hidden = true; $('timerOut').textContent = ''; }
  document.querySelectorAll('.t').forEach(b => b.addEventListener('click', () => startTimer(+b.dataset.min)));
  $('timerStop').addEventListener('click', () => { stopTimer(); say('Timer stopped.'); });
  function chime() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 660; g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ac.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 1.3);
    } catch (e) { /* no audio available */ }
  }

  // ---------- settings ----------
  const MAP = { setLarge: 'large', setSpacing: 'spacing', setContrast: 'contrast', setMotion: 'motion', setAnnounce: 'announce', setChime: 'chime' };
  function applySettings() {
    const r = document.documentElement.classList;
    r.toggle('large', S.settings.large); r.toggle('spacing', S.settings.spacing);
    r.toggle('contrast', S.settings.contrast); r.toggle('nomotion', S.settings.motion);
  }
  for (const [id, k] of Object.entries(MAP)) {
    $(id).checked = !!S.settings[k];
    $(id).addEventListener('change', () => { S.settings[k] = $(id).checked; save(); applySettings(); });
  }
  $('exportBtn').addEventListener('click', () => {
    const lines = ['StepLight list (' + today() + ')', ''];
    for (const t of S.tasks) lines.push((t.done ? '[x] ' : '[ ] ') + t.text + (t.due ? ' (due ' + t.due + ')' : ''));
    if (S.pause) lines.push('', 'Paused note: ' + (S.pause.note || ''));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    a.download = 'steplight-' + today() + '.txt';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    say('Downloaded.');
  });
  $('wipeBtn').addEventListener('click', () => {
    if (!confirm('Delete every task, note and setting stored by StepLight in this browser?')) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    S = fresh(); applySettings(); stopTimer(); renderResume();
    for (const [id, k] of Object.entries(MAP)) $(id).checked = !!S.settings[k];
    show('dump'); say('All data deleted.');
  });

  // ---------- keyboard ----------
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tagName = (e.target.tagName || '').toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return;
    const k = e.key.toLowerCase();
    if (k === '1' || k === '2' || k === '3') { e.preventDefault(); show(VIEWS[+k - 1]); return; }
    if ($('view-focus').hidden || !S.current) return;
    if (k === 'd') { e.preventDefault(); stepDone(); }
    if (k === 's') { e.preventDefault(); smaller(); }
    if (k === 'p') { e.preventDefault(); pause(); }
  });

  // ---------- boot ----------
  applySettings();
  renderResume();
  show(S.current ? 'focus' : openTasks().length ? 'pick' : 'dump', { keepFocus: true });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
