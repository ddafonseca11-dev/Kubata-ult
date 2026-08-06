import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export default function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const render = () => {
      if (!window.turnstile || !ref.current) return;
      ref.current.innerHTML = '';
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    };
    if (window.turnstile) { render(); return; }
    const existing = document.querySelector('script[data-kubata-turnstile]');
    if (existing) { existing.addEventListener('load', render, { once: true }); return () => existing.removeEventListener('load', render); }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true; script.dataset.kubataTurnstile = 'true';
    script.addEventListener('load', render, { once: true });
    document.head.appendChild(script);
    return () => { script.removeEventListener('load', render); };
  }, [siteKey, onToken]);
  return <div ref={ref} className="min-h-16" aria-label="Verificação de segurança" />;
}
