import api from '@fable/common/dist/api';
import { ScreenData } from '@fable/common/dist/types';

const references = /https?:\/\/[^\s"'<>)]*\/proxy_asset\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\?[^\s"'<>)]*)?/gi;
const blobAssets = new Map<string, string>();

export function proxyAssetKey(url: string): string | undefined {
  return blobAssets.get(url) || Array.from(url.matchAll(references))[0]?.[1];
}

/** Resolve only server-authorized asset IDs. Remote URLs never receive authoring credentials. */
export class PrivateCaptureAssets {
  private readonly controller = new AbortController();

  private readonly workspace = localStorage.getItem('fable/oid');

  private readonly pending = new Map<string, Promise<string>>();

  private readonly urls = new Set<string>();

  private bytes = 0;

  async document(source: ScreenData): Promise<ScreenData> {
    return this.rewrite(source) as Promise<ScreenData>;
  }

  private async rewrite(value: unknown): Promise<unknown> {
    if (typeof value === 'string') return this.text(value, new Set());
    if (Array.isArray(value)) {
      const result = [];
      for (const child of value) result.push(await this.rewrite(child));
      return result;
    }
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) {
        // This table is useful to editing logic, but not needed by the rendered document.
        result[key] = key === 'proxyUrlMap' ? {} : await this.rewrite(child);
      }
      return result;
    }
    return value;
  }

  private async text(value: string, ancestors: Set<string>): Promise<string> {
    const matches = Array.from(value.matchAll(references));
    let result = value;
    for (const match of matches) result = result.split(match[0]).join(await this.asset(match[1], ancestors));
    return result;
  }

  private async asset(key: string, ancestors: Set<string>): Promise<string> {
    if (ancestors.has(key)) return 'data:,';
    if (!this.pending.has(key)) {
      if (this.pending.size >= 512) throw new Error('This screen has too many captured assets. Split the recording.');
      const next = new Set(ancestors).add(key);
      this.pending.set(key, this.load(key, next));
    }
    return this.pending.get(key)!;
  }

  private async load(key: string, ancestors: Set<string>): Promise<string> {
    if (localStorage.getItem('fable/oid') !== this.workspace) throw new Error('The workspace changed. Reopen the screen.');
    let blob = await api<null, Blob>(`/proxy-file/${key}`, {
      auth: true, responseType: 'blob', signal: this.controller.signal,
    });
    this.bytes += blob.size;
    if (this.bytes > 64 * 1024 * 1024) throw new Error('Captured assets exceed 64 MiB. Split the recording.');
    if (blob.type.toLowerCase().startsWith('text/css')) {
      blob = new Blob([await this.text(await blob.text(), ancestors)], { type: 'text/css' });
    }
    if (this.controller.signal.aborted || localStorage.getItem('fable/oid') !== this.workspace) {
      throw new Error('The screen was closed or its workspace changed.');
    }
    const url = URL.createObjectURL(blob);
    blobAssets.set(url, key);
    this.urls.add(url);
    return url;
  }

  dispose(): void {
    this.controller.abort();
    this.urls.forEach(url => { URL.revokeObjectURL(url); blobAssets.delete(url); });
    this.urls.clear();
  }
}
