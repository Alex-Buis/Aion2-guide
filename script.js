// ===== Réglages (à vérifier en jeu) =====
const RESET_HOUR = 6;      // heure du reset quotidien (heure locale)
const WEEKLY_RESET_DAY = 3; // jour du reset hebdo : 0 = dimanche, 3 = mercredi
const GS_START = 1051, GS_GOAL = 1400;
const RIFT_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

// ===== Stockage (navigateur) =====
const KEY = 'aion2-guide-v2';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };
let store = load();
store.checks ??= {}; store.resets ??= {};

// ===== Langue (FR / EN / ES) =====
const i18nEls = [...document.querySelectorAll('[data-i18n]')];
const FR = {}; i18nEls.forEach(el => FR[el.dataset.i18n] = el.innerHTML);
let lang = store.lang || (navigator.language || 'fr').slice(0, 2);
if (!['fr', 'en', 'es'].includes(lang)) lang = 'fr';
let T = UI[lang];

// ===== Reset quotidien / hebdo =====
function lastDailyReset(now = new Date()) {
  const r = new Date(now); r.setHours(RESET_HOUR, 0, 0, 0);
  if (r > now) r.setDate(r.getDate() - 1);
  return r;
}
function lastWeeklyReset(now = new Date()) {
  const r = new Date(now); r.setHours(RESET_HOUR, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() - WEEKLY_RESET_DAY + 7) % 7));
  if (r > now) r.setDate(r.getDate() - 7);
  return r;
}
const lastReset = type => type === 'daily' ? lastDailyReset() : lastWeeklyReset();
const nextReset = type => { const r = lastReset(type); r.setDate(r.getDate() + (type === 'daily' ? 1 : 7)); return r; };

function applyAutoResets() {
  document.querySelectorAll('.check[data-reset]').forEach(ul => {
    const type = ul.dataset.reset, group = ul.dataset.group;
    const boundary = lastReset(type).getTime();
    if ((store.resets[group] || 0) < boundary) {
      Object.keys(store.checks).filter(k => k.startsWith(group + '-')).forEach(k => delete store.checks[k]);
      store.resets[group] = boundary;
      ul.querySelectorAll('li').forEach(li => li.classList.remove('done'));
      save();
    }
  });
}

// ===== Checklists =====
const items = [...document.querySelectorAll('.check li')];
items.forEach(li => {
  const ul = li.closest('.check');
  li.dataset.id = ul.dataset.group + '-' + [...ul.children].indexOf(li);
});
applyAutoResets();
items.forEach(li => {
  if (store.checks[li.dataset.id]) li.classList.add('done');
  li.addEventListener('click', () => {
    applyAutoResets();
    li.classList.toggle('done');
    store.checks[li.dataset.id] = li.classList.contains('done');
    save(); updateProgress();
  });
});

const recapItems = items.filter(li => li.closest('.check').dataset.group === 'recap');
function updateProgress() {
  const done = recapItems.filter(li => li.classList.contains('done')).length;
  document.querySelectorAll('.progress-text').forEach(el => el.textContent = `${done} / ${recapItems.length}`);
  document.querySelectorAll('.progress-bar').forEach(el => el.style.width = (done / recapItems.length * 100) + '%');
}
document.getElementById('reset').addEventListener('click', () => {
  recapItems.forEach(li => { li.classList.remove('done'); delete store.checks[li.dataset.id]; });
  save(); updateProgress();
});
updateProgress();

// ===== Suivi du GS =====
const gsInput = document.getElementById('gs-input');
function updateGs() {
  const gs = parseInt(gsInput.value, 10);
  const fill = document.getElementById('gs-fill'), left = document.getElementById('gs-left');
  if (isNaN(gs)) { fill.style.width = '0'; left.textContent = T.gsEmpty; return; }
  const pct = Math.max(0, Math.min(100, (gs - GS_START) / (GS_GOAL - GS_START) * 100));
  fill.style.width = pct + '%';
  left.textContent = gs >= GS_GOAL ? T.gsOk : T.gsLeft(GS_GOAL - gs);
  left.classList.toggle('ok', gs >= GS_GOAL);
}
if (store.gs) gsInput.value = store.gs;
gsInput.addEventListener('input', () => { store.gs = gsInput.value; save(); updateGs(); });
updateGs();

// ===== Rift : compte à rebours + notification =====
function nextRift() {
  const now = new Date();
  for (let d = 0; d < 2; d++) for (const h of RIFT_HOURS) {
    const t = new Date(now); t.setDate(now.getDate() + d); t.setHours(h, 0, 0, 0);
    if (t > now) return t;
  }
}
const fmt = ms => {
  const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};
const fmtLong = ms => {
  const d = Math.floor(ms / 8.64e7), h = Math.floor(ms / 3.6e6) % 24;
  return d ? `${d}${T.d} ${h}h` : `${h}h ${String(Math.floor(ms / 6e4) % 60).padStart(2, '0')}m`;
};

const notifBtn = document.getElementById('notif-btn'), notifHint = document.getElementById('notif-hint');
let notifOn = store.notif && 'Notification' in window && Notification.permission === 'granted';
let notifiedFor = 0;
function renderNotif() {
  notifBtn.textContent = notifOn ? T.notifOn : T.notifOff;
  notifBtn.classList.toggle('on', notifOn);
  notifHint.textContent = notifOn ? T.notifHint : '';
}
notifBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) { notifHint.textContent = T.notifNo; return; }
  if (notifOn) { notifOn = false; store.notif = false; save(); renderNotif(); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { notifHint.textContent = T.notifDenied; return; }
  notifOn = true; store.notif = true; save(); renderNotif();
});
renderNotif();

function tick() {
  const t = nextRift(), diff = t - new Date();
  document.getElementById('rift-next').textContent = t.toLocaleTimeString(T.locale, { hour: '2-digit', minute: '2-digit' });
  document.getElementById('rift-in').textContent = T.in + ' ' + fmt(diff);
  if (notifOn && diff <= 5 * 6e4 && notifiedFor !== t.getTime()) {
    notifiedFor = t.getTime();
    new Notification(T.notifTitle, { body: T.notifBody, icon: 'og-image.jpg' });
  }
  document.querySelectorAll('.reset-in').forEach(el => el.textContent = T.resetIn + ' ' + fmtLong(nextReset(el.dataset.for) - new Date()));
  applyAutoResets(); updateProgress();
}
tick(); setInterval(tick, 1000);

// ===== Zoom sur les captures =====
const lb = document.getElementById('lightbox');
document.querySelectorAll('.shot, .rarity img, .shot-fig img, .stuff-ref img, .items img').forEach(img =>
  img.addEventListener('click', () => { lb.querySelector('img').src = img.src; lb.hidden = false; }));
lb.addEventListener('click', () => lb.hidden = true);

// ===== Menu : section visible =====
const links = [...document.querySelectorAll('.toc a')];
const obs = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('section').forEach(s => obs.observe(s));

// ===== Bouton remonter en haut =====
const toTop = document.getElementById('to-top');
window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 500), { passive: true });
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===== Onglets 1h de jeu : avant / après 1000 GS =====
const tabs = [...document.querySelectorAll('.tab')];
function showTab(name) {
  tabs.forEach(t => { t.classList.toggle('active', t.dataset.tab === name); t.setAttribute('aria-selected', t.dataset.tab === name); });
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
}
tabs.forEach(t => t.addEventListener('click', () => { store.tab = t.dataset.tab; save(); showTab(t.dataset.tab); }));
// Onglet par défaut : choix enregistré, sinon selon le GS saisi
const savedGs = parseInt(store.gs, 10);
showTab(store.tab || (savedGs && savedGs < 1000 ? 'avant' : 'apres'));

// ===== Changement de langue =====
function setLang(l) {
  lang = l; T = UI[l]; store.lang = l; save();
  const dict = l === 'fr' ? FR : I18N[l];
  i18nEls.forEach(el => { const v = dict[el.dataset.i18n]; if (v !== undefined) el.innerHTML = v; });
  document.documentElement.lang = l;
  document.title = T.title;
  gsInput.placeholder = T.ph;
  toTop.setAttribute('aria-label', T.top);
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
  updateGs(); renderNotif(); tick();
}
document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
setLang(lang);