import api from '@fable/common/dist/api';
import { draftAssetUrl } from '@fable/common/dist/draft-assets';
import { ScreenData } from '@fable/common/dist/types';

/** The object URL belongs to one mounted preview, never to persisted document state. */
export class PrivateImage {
  private readonly controller = new AbortController();

  private readonly images = new Map<string, Promise<string>>();

  private readonly objectUrls = new Set<string>();

  async document(source: ScreenData, rid: string): Promise<ScreenData> {
    if (!this.images.has(rid)) {
      this.images.set(rid, api<null, Blob>(draftAssetUrl('screen', rid, 'index.img').href, {
        auth: true, responseType: 'blob', signal: this.controller.signal,
      }).then(blob => {
        if (this.controller.signal.aborted) throw new Error('Image preview was closed');
        const objectUrl = URL.createObjectURL(blob);
        this.objectUrls.add(objectUrl);
        return objectUrl;
      }));
    }
    const url = await this.images.get(rid)!;
    const result: ScreenData = JSON.parse(JSON.stringify(source));
    const image = result.docTree.chldrn[2]?.chldrn[1];
    if (image?.name !== 'img') throw new Error('This image screen is invalid. Replace the screen.');
    image.attrs.src = url;
    delete image.attrs.srcset;
    return result;
  }

  dispose(): void {
    this.controller.abort();
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls.clear();
  }
}
