// Onglets Amulette / Ceinture
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tabpanel').forEach(p =>
      p.classList.toggle('active', p.dataset.panel === btn.dataset.tab));
  });
});

// Checklist sauvegardée dans le navigateur
const KEY = 'aion2-guide-checklist';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
let state = load();
const items = [...document.querySelectorAll('.check li')];
items.forEach((li, i) => {
  const id = li.closest('.check').dataset.group + '-' + i;
  li.dataset.id = id;
  if (state[id]) li.classList.add('done');
  li.addEventListener('click', () => {
    li.classList.toggle('done');
    state[id] = li.classList.contains('done');
    save(state); updateProgress();
  });
});
function updateProgress() {
  const done = items.filter(li => li.classList.contains('done')).length;
  document.getElementById('progress-text').textContent = `${done} / ${items.length}`;
  document.getElementById('progress-bar').style.width = (done / items.length * 100) + '%';
}
document.getElementById('reset').addEventListener('click', () => {
  state = {}; save(state);
  items.forEach(li => li.classList.remove('done')); updateProgress();
});
updateProgress();

// Compte à rebours jusqu'au prochain rift (2/5/8/11 am & pm, heure locale)
const RIFT_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
function nextRift() {
  const now = new Date();
  for (let d = 0; d < 2; d++) {
    for (const h of RIFT_HOURS) {
      const t = new Date(now); t.setDate(now.getDate() + d); t.setHours(h, 0, 0, 0);
      if (t > now) return t;
    }
  }
}
function tick() {
  const t = nextRift(), diff = t - new Date();
  const h = Math.floor(diff / 3.6e6), m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
  document.getElementById('rift-next').textContent = t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('rift-in').textContent = `dans ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
tick(); setInterval(tick, 1000);

// Zoom sur les captures
const lb = document.getElementById('lightbox');
document.querySelectorAll('.shot, .rarity img, .shot-fig img').forEach(img =>
  img.addEventListener('click', () => { lb.querySelector('img').src = img.src; lb.hidden = false; }));
lb.addEventListener('click', () => lb.hidden = true);

// Surbrillance du menu selon la section visible
const links = [...document.querySelectorAll('.toc a')];
const obs = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('section').forEach(s => obs.observe(s));
