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

/**
 * Format and sanitize the user-provided server URL.
 */
export function formatServerUrl(rawUrl: string): string {
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token && token.trim()) {
      headers['x-sync-secret'] = token.trim();
    }

    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers,
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
      message: err.message || 'Gagal terhubung ke server. Pastikan server aktif dan port terbuka.',
    };
  }
}

export interface DeletedNoteRecord {
  id: string;
  deletedAt: number;
}

/**
 * Execute two-way synchronization between client and self-hosted server.
 */
export async function syncNotesWithServer({
  serverUrl,
  token,
  localNotes,
  deletedNotes = [],
  lastSyncTimestamp = 0,
}: {
  serverUrl: string;
  token?: string;
  localNotes: Note[];
  deletedNotes?: DeletedNoteRecord[];
  lastSyncTimestamp?: number;
}): Promise<SyncResult> {
  const url = formatServerUrl(serverUrl);
  if (!url) {
    throw new Error('URL Server belum dikonfigurasi di menu Pengaturan.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const effectiveToken = (token && token.trim()) || 'akuiki26';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-sync-secret': effectiveToken,
  };

  try {
    // Combine active local notes and deleted tombstones
    const clientNotesPayload = [
      ...localNotes,
      ...deletedNotes.map((d) => ({
        id: d.id,
        title: 'Deleted',
        content: '',
        createdAt: d.deletedAt,
        updatedAt: d.deletedAt,
        isPinned: false,
        isLocked: false,
        deletedAt: d.deletedAt,
      })),
    ];

    const response = await fetch(`${url}/api/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientNotes: clientNotesPayload,
        lastSyncTimestamp,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const errMsg = errorJson?.message || `Server merespon dengan status ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();

    return {
      success: true,
      serverNotes: data.serverNotes || [],
      syncTimestamp: data.syncTimestamp || Date.now(),
      message: 'Sinkronisasi berhasil.',
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Sinkronisasi waktu habis (Timeout 15s).');
    }
    throw err;
  }
}

/**
 * Listen for live real-time sync events from server (Server-Sent Events)
 */
export function listenRealtimeSyncEvents(
  serverUrl: string,
  token: string | undefined,
  onUpdate: () => void
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
        if (payload.type === 'notes_updated') {
          onUpdate();
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    return () => {
      es.close();
    };
  } catch (e) {
    return () => {};
  }
}

