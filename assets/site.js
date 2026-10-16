/* Café Paris – gemeinsames Verhalten für alle Seiten */
(function(){
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* Safari auf iPhone/iPad zeigt :active-Druckzustände nur, wenn die Seite Berührungen abhört */
  document.addEventListener('touchstart', () => {}, { passive: true });

  /* Route: auf iPhone, iPad und Mac direkt in Apple Karten, sonst Google Maps */
  const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  if(apple) $$('a[data-route]').forEach(a => { a.href = 'https://maps.apple.com/?daddr=' + encodeURIComponent('Berliner Straße 5, 53879 Euskirchen') + '&q=' + encodeURIComponent('Café Paris'); });

  /* Navigation: dunkel hinterlegt, sobald gescrollt wird */
  const nav = $('.nav');
  if(nav && !nav.classList.contains('solid')){
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Handy-Menü */
  const mnav = $('#mnav'), burger = $('#burger');
  function setMenu(open){
    if(!mnav) return;
    mnav.classList.toggle('open', open);
    mnav.setAttribute('aria-hidden', String(!open));
    if(burger) burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if(open) setTimeout(() => { const a = $('a', mnav); if(a) a.focus(); }, 50);
  }
  if(burger) burger.addEventListener('click', () => setMenu(true));
  $$('[data-close-menu]').forEach(el => el.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && mnav && mnav.classList.contains('open')) setMenu(false); });
  window.closeMobile = () => setMenu(false);

  /* Einblenden beim Scrollen */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('visible'));

  /* Öffnungszeiten (Euskirchen): Mo–Sa 9–19, So 9–18 */
  const HOURS = { 0: [540, 1080], 1: [540, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1140] };
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  function berlin(){
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = t => (p.find(x => x.type === t) || {}).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { wd, min: (+g('hour') % 24) * 60 + +g('minute') };
  }
  const now = berlin();
  const status = $('#open-status');
  if(status){
    const [o, c] = HOURS[now.wd];
    let txt, open = false;
    if(now.min < o) txt = 'Heute ab ' + fmt(o) + ' Uhr geöffnet';
    else if(now.min < c){ open = true; txt = 'Jetzt geöffnet · bis ' + fmt(c) + ' Uhr'; }
    else { const n = (now.wd + 1) % 7; txt = 'Geschlossen · ' + 'morgen' + ' ab ' + fmt(HOURS[n][0]) + ' Uhr'; }
    status.querySelector('span').textContent = txt;
    status.classList.toggle('closed', !open);
  }
  $$('[data-wd]').forEach(row => { if(row.dataset.wd.split(',').map(Number).includes(now.wd)) row.classList.add('today'); });

  /* Speisekarte: Leiste mit Kategorien, die beim Scrollen mitläuft */
  const chips = $('.menu-chips');
  if(chips){
    const links = $$('a', chips);
    const targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const spy = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
      es.forEach(e => {
        if(!e.isIntersecting) return;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
        const act = chips.querySelector('a.active');
        if(act) chips.scrollTo({ left: act.offsetLeft - chips.clientWidth / 2 + act.clientWidth / 2, behavior: 'smooth' });
      });
    }, { rootMargin: '-45% 0px -50% 0px' }) : null;
    targets.forEach(t => spy && spy.observe(t));
  }

  /* Karte erst nach Klick laden (vorher keine Verbindung zu Google) */
  $$('[data-map-load]').forEach(btn => btn.addEventListener('click', () => {
    const box = btn.closest('[data-map]'); if(!box) return;
    box.innerHTML = '<iframe title="Karte: Café Paris, Berliner Straße 5, Euskirchen" src="' + box.dataset.map + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>';
    box.classList.remove('map-ph');
  }));

  /* Highlights: auf dem Handy wischbar, Punkte zeigen die aktuelle Karte */
  const deck = $('#spec-cards'), dots = $('#spec-dots');
  if(deck && dots){
    const cards = $$('.card', deck);
    dots.innerHTML = cards.map((c, n) => '<button type="button" role="tab" aria-label="Highlight ' + (n + 1) + ' von ' + cards.length + ': ' + $('h3', c).textContent + '" aria-selected="' + (n === 0) + '"><i></i></button>').join('');
    const btns = $$('button', dots);
    const go = n => deck.scrollTo({ left: cards[n].offsetLeft - (deck.clientWidth - cards[n].clientWidth) / 2, behavior: 'smooth' });
    btns.forEach((b, n) => b.addEventListener('click', () => go(n)));
    let raf;
    deck.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = deck.scrollLeft + deck.clientWidth / 2;
        let best = 0, dist = Infinity;
        cards.forEach((c, n) => { const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid); if(d < dist){ dist = d; best = n; } });
        btns.forEach((b, n) => b.setAttribute('aria-selected', String(n === best)));
      });
    }, { passive: true });
  }

  /* Galerie: Bild groß anzeigen */
  const tiles = $$('.g');
  const lb = $('#lightbox');
  if(tiles.length && lb){
    const img = $('img', lb); let i = 0, last = null;
    const show = n => { i = (n + tiles.length) % tiles.length; const t = $('img', tiles[i]); img.src = t.src; img.alt = t.alt; };
    const open = n => { last = document.activeElement; show(n); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); $('.lx', lb).focus(); };
    const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); if(last) last.focus(); };
    tiles.forEach((t, n) => t.addEventListener('click', () => open(n)));
    $('.lx', lb).addEventListener('click', close);
    $('.lp', lb).addEventListener('click', () => show(i - 1));
    $('.ln', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', e => { if(e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if(!lb.classList.contains('open')) return;
      if(e.key === 'Escape') close(); if(e.key === 'ArrowLeft') show(i - 1); if(e.key === 'ArrowRight') show(i + 1);
    });
  }
})();
