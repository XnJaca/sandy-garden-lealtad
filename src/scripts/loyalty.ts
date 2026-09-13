/** Conecta el mostrador (recepción) con la tarjeta del celular. */
import QRCode from 'qrcode';
import { MEDIA, META } from '../data/families';
import {
  state, reset, tarjetaActiva, sellosDe, listaParaCanje, sellar, canjear, deshacer, crearTarjeta,
  fmt, fmtDia, iniciales, nombrePila, primerPeque, codigoBonito,
} from './store';
import { initReward } from './reward';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const BUCKET = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 9.5h13l-1.7 10.6a1 1 0 0 1-1 .4H8.2a1 1 0 0 1-1-.4L5.5 9.5Z" fill="#fbf1e5"/><path d="M8 9.5a4 4 0 0 1 8 0" stroke="#fbf1e5" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="m14.8 2.8 2.7 6.2" stroke="#fbf1e5" stroke-width="1.7" stroke-linecap="round"/><path d="m13.6 3.4 2.6-1.1 1.2 2.7-2.6 1.1z" fill="#fbf1e5"/></svg>`;

export function initLoyalty() {
  const stampsEl = $('stamps');
  for (let i = 0; i < META; i++) {
    const s = document.createElement('div');
    s.className = 'stamp';
    s.innerHTML = BUCKET;
    stampsEl.appendChild(s);
  }

  const reward = initReward({
    onRedeem: () => { const c = tarjetaActiva(); if (listaParaCanje(c)) redeem(); },
  });

  let lastQr = '';
  function drawQR(text: string) {
    if (text === lastQr) return;
    lastQr = text;
    QRCode.toCanvas($<HTMLCanvasElement>('qr'), text, {
      width: 132, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2f2119', light: '#ffffff' },
    }).catch(() => {});
  }

  function renderSelect() {
    const sel = $<HTMLSelectElement>('cust');
    sel.innerHTML = '';
    for (const c of state.cards) {
      const o = document.createElement('option');
      const n = sellosDe(c);
      o.value = c.id;
      o.textContent = `${c.name} · ${n}/${META}` + (n >= META ? ' · pase listo' : '');
      sel.appendChild(o);
    }
    sel.value = tarjetaActiva().id;
  }

  function render(popIndex?: number) {
    const c = tarjetaActiva(), n = sellosDe(c), ready = n >= META, left = Math.max(META - n, 0);
    const last = c.hist.at(-1);

    // Mostrador
    $('who').innerHTML = `<div class="avatar">${iniciales(c.name)}</div><div class="meta"><div class="name">${c.name}</div><div class="sub">${c.kids} · ${n} de ${META} visitas${last ? ' · última ' + fmt(last.d) : ''}</div></div>`;
    const btn = $<HTMLButtonElement>('stampBtn');
    btn.className = 'btn' + (ready ? ' reward' : '');
    btn.textContent = ready ? 'Canjear pase de juego libre gratis' : 'Sellar visita de hoy';
    $<HTMLButtonElement>('undoBtn').disabled = !c.hist.length;

    // Frente de la tarjeta
    $('passName').textContent = c.name;
    $('passId').textContent = codigoBonito(c.id);
    drawQR(`https://sandygarden.com/lealtad/${c.id}`);
    [...stampsEl.children].forEach((s, i) => {
      s.classList.toggle('on', i < n);
      s.classList.remove('pop');
      if (popIndex === i) { void (s as HTMLElement).offsetWidth; s.classList.add('pop'); }
    });
    $('badge10').classList.toggle('on', n >= MEDIA);
    $('badgeFree').classList.toggle('on', ready);
    if (ready) { $('progK').textContent = 'TU PASE GRATIS ESTÁ LISTO'; $('progN').textContent = '¡Sí!'; $('progS').textContent = ''; }
    else {
      $('progK').textContent = 'VISITAS PARA TU PASE GRATIS';
      $('progN').textContent = String(left);
      $('progS').textContent = left === 1 ? 'te falta una' : n >= MEDIA ? 'ya tenés 10% en café' : '';
    }
    $('ready').classList.toggle('show', ready);

    // Reverso
    $('bName').textContent = c.name; $('bKids').textContent = c.kids; $('bId').textContent = codigoBonito(c.id);
    $('bSince').textContent = fmtDia(c.since); $('bRedeemed').textContent = String(c.redeemed);
    const h = $('hist');
    h.innerHTML = '';
    if (!c.hist.length) h.innerHTML = '<li class="empty">Todavía no hay visitas. La primera se sella hoy.</li>';
    else {
      let k = 0;
      const rows = c.hist.map((e) => {
        if (e.t === 'canje') { k = 0; return { cls: 'canje', a: 'Pase gratis canjeado', b: fmt(e.d) }; }
        k++; return { cls: '', a: `Visita · sello ${k}`, b: fmt(e.d) };
      });
      rows.slice(-9).reverse().forEach((r) => {
        const li = document.createElement('li');
        li.className = r.cls;
        li.innerHTML = `<span>${r.a}</span><span>${r.b}</span>`;
        h.appendChild(li);
      });
    }
    renderSelect();
  }

  let toastTimer: ReturnType<typeof setTimeout>;
  function toast(msg: string, good = false) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (good ? ' good' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 4800);
  }

  function redeem() {
    const c = tarjetaActiva();
    canjear(c); render();
    toast(`Pase gratis canjeado para ${c.name}. La tarjeta vuelve a empezar.`, true);
  }

  function celebrar(preview: boolean) {
    const c = tarjetaActiva();
    const conPeque = c.kids && c.kids !== 'Sin registrar';
    reward.open({
      eyebrow: preview ? 'ASÍ SE VE AL COMPLETAR OCHO VISITAS' : 'OCHO VISITAS COMPLETAS',
      titleHtml: `¡Pase gratis, <em>${nombrePila(c.name)}</em>!`,
      sub: conPeque ? `Un pase de juego libre para ${primerPeque(c.kids)}, por cuenta de Sandy Garden.` : 'Un pase de juego libre, por cuenta de Sandy Garden.',
      primary: preview ? 'Cerrar vista previa' : 'Canjear en recepción',
      showSecondary: !preview,
    }, preview);
  }

  $('stampBtn').addEventListener('click', () => {
    const c = tarjetaActiva(), n = sellosDe(c);
    if (n >= META) { redeem(); return; }
    sellar(c); render(n);
    const m = sellosDe(c);
    if (m >= META) { toast(`¡${c.name} completó sus 8 visitas!`, true); setTimeout(() => celebrar(false), 650); }
    else if (m === MEDIA) toast(`Sello ${m} de ${META}. Desde hoy ${c.name} tiene 10% en el café.`, true);
    else if (m === META - 1) toast(`Sello ${m} de ${META}. Le falta una visita: buen momento para recordárselo por WhatsApp.`);
    else toast(`Sello ${m} de ${META} agregado a la tarjeta de ${c.name}.`);
  });
  $('undoBtn').addEventListener('click', () => { if (deshacer(tarjetaActiva())) { render(); toast('Último movimiento deshecho.'); } });
  $<HTMLSelectElement>('cust').addEventListener('change', (ev) => {
    state.active = (ev.target as HTMLSelectElement).value;
    $('pass').classList.remove('flipped'); render();
  });
  $('createBtn').addEventListener('click', () => {
    const nameEl = $<HTMLInputElement>('newName'), kidsEl = $<HTMLInputElement>('newKids');
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); toast('Escribí el nombre de mamá o papá para crear la tarjeta.'); return; }
    crearTarjeta(name, kidsEl.value.trim());
    nameEl.value = ''; kidsEl.value = '';
    $<HTMLDetailsElement>('newcard').open = false;
    $('pass').classList.remove('flipped'); render();
    toast(`Tarjeta creada y enviada por WhatsApp a ${name}. Ya aparece en su celular con su nombre.`, true);
  });
  $('resetBtn').addEventListener('click', () => { reset(); $('pass').classList.remove('flipped'); render(); toast('Demo reiniciada con las familias de ejemplo.'); });
  $('flipBtn').addEventListener('click', () => $('pass').classList.toggle('flipped'));
  $('backBtn').addEventListener('click', () => $('pass').classList.remove('flipped'));
  $('previewBtn').addEventListener('click', () => celebrar(true));

  const clock = () => { const d = new Date(); $('clock').textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
  clock(); setInterval(clock, 15000);

  render();
}
