/**
 * Celebración de las 8 visitas: pantalla completa con cielo y la escena de arena
 * que forma el logo de Sandy Garden (ver sandLogo.ts).
 */
import { createSandLogo, type SandLogo } from './sandLogo';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export type RewardTexts = { eyebrow: string; titleHtml: string; sub: string; primary: string; showSecondary: boolean };

export function initReward(opts: { onRedeem: () => void }) {
  const ov = document.getElementById('reward')!;
  const canvas = document.getElementById('rcanvas') as HTMLCanvasElement;
  const logoSrc = ov.dataset.logo || '/img/logo-h-madera.png';
  const text = document.getElementById('rtext')!;
  let textTimer: ReturnType<typeof setTimeout>;
  let scenePromise: Promise<SandLogo> | null = null;
  let scene: SandLogo | null = null;
  let preview = false;
  let scrollY = 0;

  function lockPage() {
    scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('locked');
  }
  function unlockPage() {
    document.body.classList.remove('locked');
    document.body.style.top = '';
    // Volver exactamente a donde estaba, sin el scroll suave de la página.
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = prev;
  }

  function open(t: RewardTexts, isPreview: boolean) {
    preview = isPreview;
    document.getElementById('rEyebrow')!.textContent = t.eyebrow;
    document.getElementById('rTitle')!.innerHTML = t.titleHtml;
    document.getElementById('rSub')!.textContent = t.sub;
    document.getElementById('rRedeem')!.textContent = t.primary;
    (document.getElementById('rLater') as HTMLElement).hidden = !t.showSecondary;
    ov.hidden = false;
    lockPage();
    text.classList.remove('show');
    clearTimeout(textTimer);
    textTimer = setTimeout(() => text.classList.add('show'), reduced ? 100 : 4300);
    scenePromise ??= createSandLogo(canvas, { logoSrc });
    scenePromise.then((s) => { scene = s; if (!ov.hidden) s.start(); }).catch(() => text.classList.add('show'));
    (document.getElementById('rclose') as HTMLElement).focus();
  }
  function close() {
    ov.hidden = true;
    unlockPage();
    scene?.stop();
    clearTimeout(textTimer);
  }

  document.getElementById('rclose')!.addEventListener('click', close);
  document.getElementById('rLater')!.addEventListener('click', close);
  document.getElementById('rRedeem')!.addEventListener('click', () => { if (!preview) opts.onRedeem(); close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ov.hidden) close(); });

  return { open, close };
}
