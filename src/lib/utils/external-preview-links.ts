import { tauriBackend } from '#lib/services/tauri-backend.js';

/** Generated anchors must open in the browser, never navigate the app webview. */
export function externalPreviewLinks(
  node: HTMLElement,
  onError: (error: string | undefined) => void,
) {
  const click = (event: MouseEvent) => {
    const link =
      event.target instanceof Element ? event.target.closest('a') : null;
    if (!link || !node.contains(link)) return;
    event.preventDefault();
    onError(undefined);
    void tauriBackend
      .openExternalUrl(link.href)
      .catch((error) => onError(String(error)));
  };
  node.addEventListener('click', click);
  return { destroy: () => node.removeEventListener('click', click) };
}
