/** El celular se inclina levemente siguiendo el cursor. Solo con mouse y sin reduced-motion. */
export function initTilt(area: HTMLElement, phone: HTMLElement) {
  if (matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  area.addEventListener('pointermove', (e) => {
    const r = area.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    phone.style.transform = `rotate(-4deg) rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
  });
  area.addEventListener('pointerleave', () => { phone.style.transform = ''; });
}
