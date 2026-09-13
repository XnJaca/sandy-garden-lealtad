/**
 * Escena de arena: miles de granos brotan, giran en remolino y se asientan formando el logo.
 * Toda la coreografía vive en el vertex shader; el CPU solo pasa el tiempo y el cursor.
 * Se usa en la celebración de las 8 visitas y en el hero de la web.
 */

const VERT = /* glsl */ `
  uniform float uTime; uniform float uPixelRatio; uniform float uScale; uniform vec2 uMouse; uniform float uMouseOn;
  attribute vec3 aTarget; attribute vec4 aSeed;
  varying float vAlpha; varying float vShade;
  float ease(float t){ return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t + 2.0, 3.0) / 2.0; }
  void main(){
    float t = uTime; vec4 s = aSeed;
    float ang = s.x * 6.2831853;
    float spread = 0.25 + s.y * 0.95;
    vec3 vel = vec3(cos(ang) * spread * 3.4, 7.2 + s.z * 4.6, sin(ang) * spread * 1.6);
    float tb = max(t - s.w * 0.45, 0.0);
    vec3 burst = vec3(0.0, -6.0, 0.0) + vel * tb - vec3(0.0, 3.6, 0.0) * tb * tb;
    float r = 1.1 + s.y * 3.4;
    float a2 = ang + t * 1.5 + s.z * 2.0;
    vec3 swirl = vec3(cos(a2) * r * 1.5, sin(a2 * 0.9 + s.x * 3.0) * r * 0.5 + sin(t * 0.8 + s.w * 6.28) * 0.35, sin(a2) * r * 0.6);
    float k1 = smoothstep(1.1, 2.0, t);
    vec3 p = mix(burst, swirl, k1);
    float k2 = ease(clamp((t - 2.7 - s.w * 1.0) / 1.6, 0.0, 1.0));
    vec3 tgt = aTarget * uScale;
    tgt += vec3(sin(t * 1.3 + s.x * 40.0), cos(t * 1.1 + s.y * 40.0), 0.0) * 0.007;
    p = mix(p, tgt, k2);
    vec2 d = p.xy - uMouse; float dist = length(d);
    float push = smoothstep(1.6, 0.0, dist) * uMouseOn * k2;
    p.xy += (d / max(dist, 0.001)) * push * 0.7;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (1.05 + s.z * 1.6) * uPixelRatio;
    gl_PointSize = size * (16.0 / -mv.z);
    vAlpha = smoothstep(0.0, 0.25, tb) * (0.7 + 0.3 * s.x);
    vShade = s.y;
  }`;

const FRAG = /* glsl */ `
  varying float vAlpha; varying float vShade;
  void main(){
    vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.18, d) * vAlpha;
    vec3 col = mix(vec3(0.54, 0.37, 0.28), vec3(0.78, 0.60, 0.50), vShade);
    col = mix(col, vec3(0.90, 0.86, 0.80), pow(vShade, 3.0) * 0.75);
    gl_FragColor = vec4(col, a);
  }`;

export type SandLogo = {
  start(): void;      // arranca (o reinicia) la coreografía
  pause(): void;      // congela sin perder el momento
  resume(): void;     // continúa donde quedó
  stop(): void;
  resize(): void;
  readonly running: boolean;
};

export type SandLogoOptions = {
  logoSrc: string;
  fill?: number;        // fracción del ancho del lienzo que ocupa el logo
  yShift?: number;      // desplazamiento vertical del logo, en fracción del alto visible
  particles?: number;
};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

/** Muestrea los píxeles opacos del logo y los devuelve normalizados (ancho = 1). */
function sampleLogo(src: string): Promise<{ pts: [number, number][]; w: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const w = 560, h = Math.round((w * img.height) / img.width);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d')!;
      x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data;
      const pts: [number, number][] = [];
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++)
          if (d[(j * w + i) * 4 + 3] > 110) pts.push([i / w - 0.5, -(j / h - 0.5) * (h / w)]);
      resolve({ pts, w });
    };
    img.onerror = () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 4000; i++) { const a = Math.random() * 6.283; pts.push([Math.cos(a) * 0.35, Math.sin(a) * 0.21]); }
      resolve({ pts, w: 560 });
    };
  });
}

export async function createSandLogo(canvas: HTMLCanvasElement, opts: SandLogoOptions): Promise<SandLogo> {
  const fill = opts.fill ?? 0.86, yShift = opts.yShift ?? 0.22;
  // Three.js solo se descarga cuando hace falta la escena.
  const [THREE, { pts, w }] = await Promise.all([import('three'), sampleLogo(opts.logoSrc)]);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 10;

  const N = opts.particles ?? (coarse ? 12000 : 30000);
  const pos = new Float32Array(N * 3), tgt = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const p = pts[Math.floor(Math.random() * pts.length)];
    tgt[i * 3] = p[0] + (Math.random() - 0.5) / w;
    tgt[i * 3 + 1] = p[1] + (Math.random() - 0.5) / w;
    tgt[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
    pos[i * 3 + 1] = -20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(tgt, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false,
    uniforms: {
      uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() }, uScale: { value: 8 },
      uMouse: { value: new THREE.Vector2(99, 99) }, uMouseOn: { value: 0 },
    },
  });
  const points = new THREE.Points(geo, mat);
  // Las posiciones reales se calculan en el shader: sin esto Three descarta el objeto por frustum culling.
  points.frustumCulled = false;
  scene.add(points);

  let halfW = 1, halfH = 1, running = false, t0 = 0, pausedAt = 0;
  const box = () => { const r = canvas.getBoundingClientRect(); return { r, w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) }; };
  function resize() {
    const { w, h } = box();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    halfW = halfH * camera.aspect;
    mat.uniforms.uScale.value = Math.min(halfW * 2 * fill, 11.5);
    points.position.y = halfH * yShift;
  }
  addEventListener('resize', () => { if (running) resize(); });
  visualViewport?.addEventListener('resize', () => { if (running) resize(); });
  addEventListener('pointermove', (e) => {
    if (!running) return;
    const { r, w, h } = box();
    const nx = (e.clientX - r.left) / w, ny = (e.clientY - r.top) / h;
    mat.uniforms.uMouse.value.set((nx * 2 - 1) * halfW, -(ny * 2 - 1) * halfH - points.position.y);
    mat.uniforms.uMouseOn.value = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1 ? 1 : 0;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mat.uniforms.uMouseOn.value = 0; });

  function loop(now: number) {
    if (!running) return;
    mat.uniforms.uTime.value = reduced ? 8 : (now - t0) / 1000;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  return {
    get running() { return running; },
    resize,
    start() { resize(); t0 = performance.now(); pausedAt = 0; running = true; requestAnimationFrame(loop); },
    pause() { if (!running) return; pausedAt = performance.now(); running = false; },
    resume() { if (running) return; if (!pausedAt) { this.start(); return; } t0 += performance.now() - pausedAt; pausedAt = 0; running = true; resize(); requestAnimationFrame(loop); },
    stop() { running = false; pausedAt = 0; },
  };
}
