import { Platform } from 'react-native';
import { Note } from '@/db/types';

export interface SyncResult {
  success: boolean;
  serverNotes: Note[];
  syncTimestamp: number;
  message?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  serverInfo?: {
    server: string;
    version: string;
    authRequired: boolean;
  };
}

export interface DeletedNoteRecord {
  id: string;
  deletedAt: number;
}

/**
 * Format and sanitize the user-provided server URL.
 */
export function formatServerUrl(rawUrl?: string): string {
  let url = (rawUrl || '').trim();

  // If empty on Web, default to current origin (ideal for self-hosted container)
  if (!url && Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  if (!url) return '';

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Add default protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  return url;
}

function getHeaders(token?: string) {
  const effectiveToken = (token && token.trim()) || 'akuiki26';
  return {
    'Content-Type': 'application/json',
    'x-sync-secret': effectiveToken,
  };
}

/**
 * Fetch all active notes directly from the online server.
 */
export async function fetchOnlineNotes(serverUrl?: string, token?: string): Promise<Note[]> {
  const url = formatServerUrl(serverUrl);
  if (!url) return [];

  const response = await fetch(`${url}/api/notes`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil catatan dari server (${response.status})`);
  }

  const data = await response.json();
  return (data.notes || []) as Note[];
}

/**
 * Create a new note directly on the online server.
 */
export async function createOnlineNote(
  noteData: Partial<Note>,
  serverUrl?: string,
  token?: string
): Promise<Note> {
  const url = formatServerUrl(serverUrl);
  if (!url) throw new Error('Server URL tidak tersedia');

  const response = await fetch(`${url}/api/notes`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(noteData),
  });

  if (!response.ok) {
    throw new Error(`Gagal membuat catatan di server (${response.status})`);
  }

  return (await response.json()) as Note;
}

/**
 * Update an existing note directly on the online server.
 */
export async function updateOnlineNote(
  id: string,
  updates: Partial<Note>,
  serverUrl?: string,
  token?: string
): Promise<Note> {
  const url = formatServerUrl(serverUrl);
  if (!url) throw new Error('Server URL tidak tersedia');

  const response = await fetch(`${url}/api/notes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Gagal memperbarui catatan di server (${response.status})`);
  }

  return (await response.json()) as Note;
}

/**
 * Delete a note directly on the online server.
 */
export async function deleteOnlineNote(
  id: string,
  serverUrl?: string,
  token?: string
): Promise<void> {
  const url = formatServerUrl(serverUrl);
  if (!url) return;

  const response = await fetch(`${url}/api/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Gagal menghapus catatan di server (${response.status})`);
  }
}

/**
 * Listen for live real-time events from server (Server-Sent Events)
 */
export function listenRealtimeSyncEvents(
  serverUrl: string | undefined,
  token: string | undefined,
  onEvent: (type: string, payload?: any) => void
): () => void {
  const url = formatServerUrl(serverUrl);
  if (!url || typeof EventSource === 'undefined') {
    return () => {};
  }

  try {
    const sseUrl = new URL(`${url}/api/events`);
    const effectiveToken = (token && token.trim()) || 'akuiki26';
    sseUrl.searchParams.set('secret', effectiveToken);

    const es = new EventSource(sseUrl.toString());

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type) {
          onEvent(payload.type, payload);
        }
      } catch (e) {
        // Ignore parse error
      }
    };

    return () => {
      es.close();
    };
  } catch (e) {
    return () => {};
  }
}

/**
 * Test connectivity with the self-hosted MeNotes backend.
 */
export async function testServerConnection(
  serverUrl: string,
  token?: string
): Promise<ConnectionTestResult> {
  const url = formatServerUrl(serverUrl);
  if (!url) {
    return { success: false, message: 'URL Server belum diisi.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: getHeaders(token),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          message: 'Server menolak koneksi: Token (SYNC_SECRET) salah atau diperlukan.',
        };
      }
      return {
        success: false,
        message: `Server merespon dengan status ${response.status}.`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Berhasil terhubung ke Server MeNotes!',
      serverInfo: {
        server: data.server || 'MeNotes Sync Server',
        version: data.version || '1.0.0',
        authRequired: Boolean(data.authRequired),
      },
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: 'Koneksi waktu habis (Timeout 6s). Periksa URL/IP server.' };
    }
    return {
      success: false,
      message: err.message || 'Gagal terhubung ke server.',
    };
  }
}
