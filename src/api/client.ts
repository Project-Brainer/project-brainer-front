import { BackendError, type BackendErrorBody } from './types';

const DEFAULT_BASE = 'http://localhost:3000/api/v1';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  DEFAULT_BASE;

type Json = unknown;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Json;
  signal?: AbortSignal;
}

function joinUrl(path: string): string {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${API_BASE_URL}${path}`;
}

function flattenMessage(
  msg: BackendErrorBody['message'],
  fallback: string,
): string {
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join('; ');
  if (msg && typeof msg === 'object') {
    const main = msg.message;
    const errors = Array.isArray(msg.errors) ? msg.errors.join('; ') : '';
    return [main, errors].filter(Boolean).join(' — ') || fallback;
  }
  return fallback;
}

async function request<T>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  const init: RequestInit = {
    method,
    signal,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(joinUrl(path), init);

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // non-json body — keep as raw text
      parsed = text;
    }
  }

  if (!res.ok) {
    const errBody =
      parsed && typeof parsed === 'object' ? (parsed as BackendErrorBody) : undefined;
    const message = errBody
      ? flattenMessage(errBody.message, res.statusText)
      : typeof parsed === 'string' && parsed
      ? parsed
      : res.statusText;
    throw new BackendError(res.status, message, errBody);
  }

  return parsed as T;
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: Json, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  put: <T>(path: string, body?: Json, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  patch: <T>(path: string, body?: Json, signal?: AbortSignal) =>
    request<T>(path, { method: 'PATCH', body, signal }),
  del: <T = void>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'DELETE', signal }),
};
