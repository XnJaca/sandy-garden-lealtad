/**
 * Superficie de arena viva: textura procedural de fondo y surcos que deja el cursor,
 * que se van borrando solos como arena cinética.
 *
 * El surco (sombra) y el borde iluminado se pintan opacos en dos capas propias y se
 * mezclan con la arena una sola vez por cuadro. Así los tramos que se cruzan o se
 * repasan no se oscurecen entre sí y el trazo queda continuo y suave.
 */
export function initSand(canvas: HTMLCanvasElement, hint?: HTMLElement | null) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const GROOVE = 30, LIGHT = 34;             // ancho del surco y del borde iluminado
  const GROOVE_ALPHA = 0.26, LIGHT_ALPHA = 0.5;
  const FADE = 0.018;                         // cuánto se borra por cuadro
  const BLUR = 'blur(1.6px)';

  let W = 0, H = 0;
  let base: HTMLCanvasElement, groove: HTMLCanvasElement, light: HTMLCanvasElement;
  let gctx: CanvasRenderingContext2D, lctx: CanvasRenderingContext2D;
  let last: { x: number; y: number } | null = null;
  let activeUntil = 0, raf = 0;

  const layer = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

  function build() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
    base = layer();
    const b = base.getContext('2d')!;
    const g = b.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#e6d8c1'); g.addColorStop(1, '#dccbb0');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const cx = Math.random() * W, cy = Math.random() * H;
      const rg = b.createRadialGradient(cx, cy, 0, cx, cy, 200 + Math.random() * 500);
      rg.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,245,228,.35)' : 'rgba(180,150,115,.16)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = rg; b.fillRect(0, 0, W, H);
    }
    const img = b.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9;
    }
    b.putImageData(img, 0, 0);

    groove = layer(); gctx = groove.getContext('2d')!;
    light = layer(); lctx = light.getContext('2d')!;
    for (const c of [gctx, lctx]) { c.lineCap = 'round'; c.lineJoin = 'round'; }
    gctx.strokeStyle = '#9a7454'; gctx.lineWidth = GROOVE;
    lctx.strokeStyle = '#fff8ea'; lctx.lineWidth = LIGHT;

    ctx!.drawImage(base, 0, 0);
  }

  function compose() {
    ctx!.globalAlpha = 1;
    ctx!.drawImage(base, 0, 0);
    ctx!.filter = BLUR;
    ctx!.globalAlpha = LIGHT_ALPHA; ctx!.drawImage(light, 3, 4);
    ctx!.globalAlpha = GROOVE_ALPHA; ctx!.drawImage(groove, 0, 0);
    ctx!.filter = 'none';
    ctx!.globalAlpha = 1;
  }

  function fade(c: CanvasRenderingContext2D) {
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = `rgba(0,0,0,${FADE})`;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  }

  function frame() {
    fade(gctx); fade(lctx);
    compose();
    raf = performance.now() < activeUntil ? requestAnimationFrame(frame) : 0;
    if (!raf) ctx!.drawImage(base, 0, 0);
  }

  function mark(x: number, y: number) {
    if (!last) { last = { x, y }; return; }
    for (const c of [lctx, gctx]) {
      c.beginPath(); c.moveTo(last.x, last.y); c.lineTo(x, y); c.stroke();
    }
    last = { x, y };
    activeUntil = performance.now() + 16000;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  build();
  let rt: ReturnType<typeof setTimeout>;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });

  if (coarse || reduced) { if (hint) hint.hidden = true; return; }
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') mark(e.clientX, e.clientY); }, { passive: true });
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') last = { x: e.clientX, y: e.clientY }; });
  document.addEventListener('pointerleave', () => { last = null; });
}
