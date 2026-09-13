/**
 * El logo se escribe en la arena como con un dedo: el surco se abre de izquierda a derecha,
 * primero la línea del nombre y después la del tagline. Canvas 2D, sin dependencias.
 */
export type SandWriter = { start(): void; stop(): void; resize(): void };

type Band = { y0: number; y1: number; from: number; to: number; path: Float32Array };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

export async function createSandWriter(canvas: HTMLCanvasElement, opts: { logoSrc: string; fill?: number; duration?: number }): Promise<SandWriter> {
  const img = await loadImage(opts.logoSrc);
  const ctx = canvas.getContext('2d')!;
  const fill = opts.fill ?? 0.72, duration = opts.duration ?? 5200;
  const DPR = Math.min(devicePixelRatio || 1, 2);

  let W = 0, H = 0, lw = 0, lh = 0, lx = 0, ly = 0;
  let mask: HTMLCanvasElement, groove: HTMLCanvasElement, light: HTMLCanvasElement;
  let bands: Band[] = [];
  let t0 = 0, raf = 0, running = false, done = false;

  const layer = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /** Prepara capas y bandas para el tamaño actual. */
  function build() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(1, Math.round(r.width * DPR));
    H = canvas.height = Math.max(1, Math.round(r.height * DPR));
    lw = Math.round(W * fill); lh = Math.round(lw * img.height / img.width);
    if (lh > H * 0.8) { lh = Math.round(H * 0.8); lw = Math.round(lh * img.width / img.height); }
    lx = Math.round((W - lw) / 2); ly = Math.round((H - lh) / 2);

    // Máscara del logo al tamaño final
    mask = layer(lw, lh);
    const m = mask.getContext('2d')!;
    m.drawImage(img, 0, 0, lw, lh);

    // Surco (sombra) y borde iluminado, como el rastro del cursor
    const tint = (color: string, grow: number) => {
      const c = layer(lw + 12, lh + 12), x = c.getContext('2d')!;
      x.filter = grow ? `blur(${grow}px)` : 'none';
      x.drawImage(mask, 6, 6);
      x.filter = 'none';
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      return c;
    };
    groove = tint('#7a563a', 1.1 * DPR);
    light = tint('#fff6e6', 1.6 * DPR);

    // Bandas: filas con tinta separadas por un hueco (nombre arriba, tagline abajo)
    const d = m.getImageData(0, 0, lw, lh).data;
    const rowInk = new Uint8Array(lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) if (d[(y * lw + x) * 4 + 3] > 90) { rowInk[y] = 1; break; }
    const rows: [number, number][] = [];
    let y = 0;
    while (y < lh) {
      if (!rowInk[y]) { y++; continue; }
      let s = y; while (y < lh && (rowInk[y] || (rowInk[y + 1] ?? 0) || (rowInk[y + 2] ?? 0))) y++;
      rows.push([s, y]);
    }
    const total = rows.reduce((a, [s, e]) => a + (e - s), 0) || 1;
    let acc = 0;
    bands = rows.map(([s, e]) => {
      // La banda más alta (el nombre) toma más tiempo; el tagline va más rápido
      const share = (e - s) / total;
      const from = acc, to = acc + share; acc = to;
      // Trayectoria del dedo: por columna, centro vertical de la tinta de esa banda
      const path = new Float32Array(lw);
      let last = (s + e) / 2;
      for (let x = 0; x < lw; x++) {
        let sum = 0, n = 0;
        for (let yy = s; yy < e; yy++) if (d[(yy * lw + x) * 4 + 3] > 90) { sum += yy; n++; }
        last = n ? sum / n : last;
        path[x] = last;
      }
      return { y0: s, y1: e, from, to, path };
    });
    // Pequeña pausa entre bandas
    const gap = 0.06;
    bands.forEach((b, i) => { b.from = b.from * (1 - gap * (bands.length - 1)) + gap * i; b.to = b.to * (1 - gap * (bands.length - 1)) + gap * i; });
  }

  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function draw(p: number) {
    ctx.clearRect(0, 0, W, H);
    for (const b of bands) {
      const k = Math.min(1, Math.max(0, (p - b.from) / (b.to - b.from)));
      if (k <= 0) continue;
      const front = Math.round(lw * ease(k));
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx - 6, ly + b.y0 - 6, front + 6, b.y1 - b.y0 + 12);
      ctx.clip();
      ctx.globalAlpha = 0.75; ctx.drawImage(light, lx - 6 + 2.5 * DPR, ly - 6 + 3.5 * DPR);
      ctx.globalAlpha = 0.66; ctx.drawImage(groove, lx - 6, ly - 6);
      ctx.restore();
      // El dedo: una sombra suave justo en el frente del trazo
      if (k < 1 && front > 0) {
        const fx = lx + front, fy = ly + b.path[Math.min(lw - 1, front)];
        const rad = 9 * DPR;
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, rad * 2.2);
        g.addColorStop(0, 'rgba(120,90,64,.35)'); g.addColorStop(1, 'rgba(120,90,64,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(fx, fy, rad * 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now: number) {
    if (!running) return;
    const p = reduced ? 1 : Math.min(1, (now - t0) / duration);
    draw(p);
    if (p >= 1) { running = false; done = true; return; }
    raf = requestAnimationFrame(loop);
  }

  build();
  let rt: ReturnType<typeof setTimeout>;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (done) draw(1); }, 150); });

  return {
    resize() { build(); if (done) draw(1); },
    start() { cancelAnimationFrame(raf); done = false; t0 = performance.now(); running = true; raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
