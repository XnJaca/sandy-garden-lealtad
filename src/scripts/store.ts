import { familiasDemo, META, type Estado, type Tarjeta } from '../data/families';

const KEY = 'sg-lealtad-demo-v3';

export let state: Estado = load();

function load(): Estado {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Estado;
  } catch { /* navegador sin storage: seguimos en memoria */ }
  return familiasDemo();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignorar */ }
}

export function reset() {
  state = familiasDemo();
  save();
}

export const tarjetaActiva = (): Tarjeta =>
  state.cards.find((c) => c.id === state.active) ?? state.cards[0];

/** Sellos acumulados desde el último canje. */
export function sellosDe(c: Tarjeta): number {
  let n = 0;
  for (const h of c.hist) n = h.t === 'canje' ? 0 : n + 1;
  return n;
}

export const listaParaCanje = (c: Tarjeta) => sellosDe(c) >= META;

export const ahoraIso = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

export function sellar(c: Tarjeta) { c.hist.push({ t: 'sello', d: ahoraIso() }); save(); }
export function canjear(c: Tarjeta) { c.hist.push({ t: 'canje', d: ahoraIso() }); c.redeemed++; save(); }
export function deshacer(c: Tarjeta) {
  const e = c.hist.pop();
  if (e?.t === 'canje') c.redeemed = Math.max(0, c.redeemed - 1);
  save();
  return e;
}

export function crearTarjeta(name: string, kids: string): Tarjeta {
  const id = 'sg-' + (1100 + Math.floor(Math.random() * 899));
  const t: Tarjeta = { id, name, kids: kids || 'Sin registrar', since: new Date().toISOString().slice(0, 10), redeemed: 0, hist: [] };
  state.cards.push(t);
  state.active = id;
  save();
  return t;
}

/* Formato */
export const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit' });
};
export const fmtDia = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
export const iniciales = (n: string) => n.replace(/^Familia\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
/** "Valeria Mora" → "Valeria"; "Familia Rojas Salas" → "familia Rojas Salas". */
export const nombrePila = (n: string) => /^Familia\s+/i.test(n) ? n.replace(/^Familia/i, 'familia') : n.split(/\s+/)[0];
/** "Mateo y Luca, 5 y 2 años" → "Mateo y Luca"; "Emma, 3 años" → "Emma". */
export const primerPeque = (k: string) => k.split(',')[0].trim();
export const codigoBonito = (id: string) => id.toUpperCase().replace('-', ' · ');
