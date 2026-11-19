import { useEffect, useState } from 'react';

export type Route =
  | { name: 'path' }
  | { name: 'lesson'; id: string }
  | { name: 'checkpoint'; unitId: string }
  | { name: 'practice' }
  | { name: 'practiceRun'; ids?: string[]; unitId?: string }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'cheat'; unitId: string }
  | { name: 'onboarding' }
  | { name: 'placement' };

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(query);
  switch (parts[0]) {
    case 'lesson':
      return parts[1] ? { name: 'lesson', id: parts[1] } : { name: 'path' };
    case 'checkpoint':
      return parts[1] ? { name: 'checkpoint', unitId: parts[1] } : { name: 'path' };
    case 'practice':
      if (parts[1] === 'run') return { name: 'practiceRun', ids: q.get('ids')?.split(',').filter(Boolean), unitId: q.get('unit') ?? undefined };
      return { name: 'practice' };
    case 'profile':
      return { name: 'profile' };
    case 'settings':
      return { name: 'settings' };
    case 'cheat':
      return parts[1] ? { name: 'cheat', unitId: parts[1] } : { name: 'path' };
    case 'welcome':
      return { name: 'onboarding' };
    case 'placement':
      return { name: 'placement' };
    default:
      return { name: 'path' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'path':
      return '#/';
    case 'lesson':
      return `#/lesson/${encodeURIComponent(r.id)}`;
    case 'checkpoint':
      return `#/checkpoint/${encodeURIComponent(r.unitId)}`;
    case 'practice':
      return '#/practice';
    case 'practiceRun': {
      const q = new URLSearchParams();
      if (r.ids?.length) q.set('ids', r.ids.join(','));
      if (r.unitId) q.set('unit', r.unitId);
      const s = q.toString();
      return `#/practice/run${s ? `?${s}` : ''}`;
    }
    case 'profile':
      return '#/profile';
    case 'settings':
      return '#/settings';
    case 'cheat':
      return `#/cheat/${encodeURIComponent(r.unitId)}`;
    case 'onboarding':
      return '#/welcome';
    case 'placement':
      return '#/placement';
  }
}

export function navigate(r: Route, replace = false) {
  const h = href(r);
  if (replace) {
    history.replaceState(null, '', h);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else location.hash = h;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
