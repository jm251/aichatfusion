const LOCAL_BACKEND_URL = 'http://localhost:3001';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getBackendUrl(): string {
  const configuredUrl = import.meta.env.VITE_BACKEND_URL;
  if (configuredUrl && configuredUrl.trim().length > 0) {
    return configuredUrl.trim();
  }

  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return LOCAL_BACKEND_URL;
  }

  return '';
}
