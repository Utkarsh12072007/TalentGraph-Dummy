// Tiny fetch wrapper around our REST API.
// - Same-origin requests (Vite proxies /api to Express), so cookies flow
//   automatically — no tokens in localStorage.
// - Responses follow { data } or { error: { code, message, details } }.
// - ApiError carries status + message so pages can render friendly errors.

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(method, url, body, options = {}) {
  const isFormData = body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    ...options,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* empty body (e.g. 204) */
  }

  if (!res.ok) {
    const err = payload?.error || {};
    throw new ApiError(res.status, err.code || 'ERROR', err.message || `Request failed (${res.status})`, err.details);
  }
  return payload?.data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  patch: (url, body) => request('PATCH', url, body),
  put: (url, body) => request('PUT', url, body),
  delete: (url) => request('DELETE', url),
  upload: (url, formData) => request('POST', url, formData),
  uploadPatch: (url, formData) => request('PATCH', url, formData),
};

// Helper for file downloads (resume PDF etc.) — fetch then save via <a>.
export async function downloadFile(url, filename) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    let message = 'Download failed';
    try {
      const payload = await res.json();
      message = payload?.error?.message || message;
    } catch { /* ignore */ }
    throw new ApiError(res.status, 'DOWNLOAD_FAILED', message);
  }
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
