// Smart invoke wrapper that uses Tauri when available, mocks otherwise

import { isTauri, mockInvoke } from './tauriMock';

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    // Use real Tauri invoke
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke<T>(cmd, args);
  } else {
    // Use mock implementation
    console.log(`[Mock] ${cmd}`, args);
    return mockInvoke<T>(cmd, args);
  }
}
