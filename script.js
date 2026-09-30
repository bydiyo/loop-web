(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nav: scrolled state
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const burger = $('#burger'), links = $('#navLinks');
  const setMenu = (open) => {
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  burger.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Scroll reveal (stagger siblings)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal, .step').forEach((el) => {
    const sibs = $$(':scope > .reveal', el.parentElement);
    el.style.setProperty('--rd', Math.min(sibs.indexOf(el), 6) * 80 + 'ms');
    io.observe(el);
  });

  // Active link + viewfinder section counter
  const navMap = new Map($$('.nav-links a[href^="#"]:not(.btn)').map((a) => [a.getAttribute('href').slice(1), a]));
  const vfSec = $('#vfSec');
  const secs = $$('[data-sec]');
  const total = String(secs.length).padStart(2, '0');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      vfSec.textContent = `${en.target.dataset.sec}/${total}`;
      navMap.forEach((a) => a.classList.remove('active'));
      const a = navMap.get(en.target.id);
      if (a) a.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach((s) => spy.observe(s));

  // REC timecode
  const tc = $('#vfTime'), t0 = Date.now();
  const pad = (n) => String(n).padStart(2, '0');
  setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    tc.textContent = `${pad(s / 3600 | 0)}:${pad((s / 60 | 0) % 60)}:${pad(s % 60)}`;
  }, 1000);

  // Hero counter + bars
  const card = $('.hero-card');
  $$('.hc-bars i').forEach((b, i) => b.style.transitionDelay = 300 + i * 90 + 'ms');
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    const el = $('[data-count]', card), end = +el.dataset.count;
    if (reduced) { el.textContent = end; } else {
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 1600, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    obs.disconnect();
  }, { threshold: 0.4 }).observe(card);

  // Search mock typing
  const sm = $('#smType');
  if (sm && !reduced) {
    const queries = ['constructora en monterrey', 'despacho contable', 'proveedor industrial', 'clínica dental cerca'];
    let qi = 0, ci = queries[0].length, del = true;
    const loop = () => {
      const q = queries[qi];
      if (del) { ci--; if (ci === 0) { del = false; qi = (qi + 1) % queries.length; } }
      else { ci++; if (ci === queries[qi].length) { del = true; sm.textContent = queries[qi]; return setTimeout(loop, 2200); } }
      sm.textContent = (del ? q : queries[qi]).slice(0, ci);
      setTimeout(loop, del ? 35 : 70);
    };
    setTimeout(loop, 2500);
  }

  // Service cards: spotlight + tap/click to expand
  $$('.svc').forEach((card) => {
    const btn = $('.svc-tog', card);
    const toggle = () => {
      const open = !card.classList.contains('open');
      card.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      $('span', btn).textContent = open ? 'Cerrar' : 'Qué incluye';
    };
    card.addEventListener('click', (e) => { if (!e.target.closest('a')) toggle(); });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); toggle(); }
    });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', e.clientX - r.left + 'px');
      card.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  });

  // Package cards: tap highlight on touch
  $$('.pkg').forEach((p) => p.addEventListener('touchstart', () => {
    $$('.pkg').forEach((o) => o.classList.toggle('tap', o === p));
  }, { passive: true }));

  // Form validation
  const form = $('#form');
  const rules = {
    nombre: (v) => v.trim().length >= 2 || 'Escribe tu nombre.',
    telefono: (v) => v.replace(/\D/g, '').length >= 10 || 'Escribe un teléfono de 10 dígitos.',
    giro: (v) => !!v || 'Elige el giro de tu empresa.',
  };
  const check = (el) => {
    const rule = rules[el.name];
    if (!rule) return true;
    const res = rule(el.value);
    const row = el.closest('.f-row');
    row.classList.toggle('err', res !== true);
    $('.f-err', row).textContent = res === true ? '' : res;
    el.setAttribute('aria-invalid', res !== true);
    return res === true;
  };
  $$('input, select', form).forEach((el) => {
    el.addEventListener('blur', () => check(el));
    el.addEventListener('input', () => el.closest('.f-row').classList.contains('err') && check(el));
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = $$('[name]', form).filter((el) => rules[el.name]);
    const ok = fields.map(check).every(Boolean);
    if (!ok) { fields.find((el) => el.getAttribute('aria-invalid') === 'true').focus(); return; }
    const d = Object.fromEntries(new FormData(form));
    const msg = `Hola loop, soy ${d.nombre}, mi empresa es del giro ${d.giro}. Mi teléfono: ${d.telefono}.${d.mensaje ? ' ' + d.mensaje : ''} Quiero agendar una consulta.`;
    $('#formOk').hidden = false;
    form.querySelector('button[type=submit]').disabled = true;
    // Sin backend: abre WhatsApp con los datos. Para Netlify Forms, añade data-netlify="true" al <form>.
    setTimeout(() => window.open('https://wa.me/528100000000?text=' + encodeURIComponent(msg), '_blank', 'noopener'), 600);
  });

  // Asistente (chat)
  const chat = $('#chat'), openBtn = $('#chatOpen'), log = $('#chatLog');
  const chatForm = $('#chatForm'), chatIn = $('#chatIn'), chips = $('#chatChips'), tip = $('#chatTip');
  const sendBtn = $('.chat-send', chatForm);
  const KEY = 'loop-chat';
  let history = [];
  let busy = false;

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(?<!href=")(https?:\/\/[^\s<)]+[^\s<).,])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

  const addMsg = (role, text) => {
    const el = document.createElement('div');
    el.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
    el.innerHTML = fmt(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history)); } catch {} };
  try {
    history = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    history.forEach((m) => addMsg(m.role, m.content));
    if (history.length) chips.hidden = true;
  } catch { history = []; }

  const setChat = (open) => {
    openBtn.setAttribute('aria-expanded', open);
    openBtn.setAttribute('aria-label', open ? 'Cerrar asistente de loop' : 'Abrir asistente de loop');
    document.body.classList.toggle('chat-on', open);
    tip.classList.remove('show');
    if (open) {
      chat.hidden = false;
      requestAnimationFrame(() => chat.classList.add('open'));
      log.scrollTop = log.scrollHeight;
      if (matchMedia('(min-width: 768px)').matches) chatIn.focus();
    } else {
      chat.classList.remove('open');
      setTimeout(() => { if (!chat.classList.contains('open')) chat.hidden = true; }, 300);
    }
  };
  openBtn.addEventListener('click', () => setChat(openBtn.getAttribute('aria-expanded') !== 'true'));
  $('#chatClose').addEventListener('click', () => { setChat(false); openBtn.focus(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chat.hidden) setChat(false); });
  setTimeout(() => { if (chat.hidden && !history.length) tip.classList.add('show'); }, 6000);
  setTimeout(() => tip.classList.remove('show'), 14000);

  chatIn.addEventListener('input', () => {
    chatIn.style.height = 'auto';
    chatIn.style.height = Math.min(chatIn.scrollHeight, 120) + 'px';
  });
  chatIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatForm.requestSubmit(); }
  });
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) ask(b.textContent);
  });
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(chatIn.value);
  });

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    chips.hidden = true;
    chatIn.value = '';
    chatIn.style.height = 'auto';
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    save();

    const bubble = addMsg('assistant', '');
    bubble.innerHTML = '';
    bubble.classList.add('typing');
    bubble.innerHTML = '<i></i><i></i><i></i>';
    let reply = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error(res.status);
      const reader = res.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += dec.decode(value, { stream: true });
        bubble.classList.remove('typing');
        bubble.innerHTML = fmt(reply);
        log.scrollTop = log.scrollHeight;
      }
      reply = reply.trim();
      if (!reply) throw new Error('vacío');
    } catch {
      reply = 'Ahora mismo no puedo responder. Escríbenos por WhatsApp y te atendemos: https://wa.me/528100000000';
    }
    bubble.classList.remove('typing');
    bubble.innerHTML = fmt(reply);
    history.push({ role: 'assistant', content: reply });
    save();
    busy = false;
    sendBtn.disabled = false;
    log.scrollTop = log.scrollHeight;
  }

  $('#yr').textContent = new Date().getFullYear();
})();
