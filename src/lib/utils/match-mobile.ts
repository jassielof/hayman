/** Tailwind `sm` breakpoint — viewports below this are treated as mobile. */
export const MOBILE_MAX_WIDTH_PX = 639;

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches;
}

export function watchMobileViewport(onChange: (isMobile: boolean) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
  const handler = () => onChange(mq.matches);

  handler();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
