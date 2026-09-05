import { DOMExportOutput } from 'lexical';

type VideoEmbedProps = {
  isEmbeddable: boolean;
  embedProvider: 'youtube' | 'loom' | 'vimeo' | null;
  embedUrl: string;
};

export const getVideoEmbedabilityProps = (input: string): VideoEmbedProps => {
  const absent: VideoEmbedProps = { isEmbeddable: false, embedProvider: null, embedUrl: '' };
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return absent;
    const host = url.hostname.replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    if (host === 'youtube.com' || host === 'youtu.be') {
      const id = host === 'youtu.be' ? parts[0] : url.pathname === '/watch'
        ? url.searchParams.get('v') : ['embed', 'v', 'shorts'].includes(parts[0]) ? parts[1] : parts[0];
      if (id && /^[\w-]{11}$/.test(id)) {
        return { isEmbeddable: true, embedProvider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` };
      }
    } else if (host === 'loom.com' && ['share', 'embed'].includes(parts[0])) {
      if (/^[a-zA-Z0-9-]{1,64}$/.test(parts[1] || '') && parts.length === 2) {
        return { isEmbeddable: true, embedProvider: 'loom', embedUrl: `https://www.loom.com/embed/${parts[1]}` };
      }
    } else if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = parts[0] === 'video' ? parts[1] : parts[0];
      if (/^\d+$/.test(id || '') && parts.length === (parts[0] === 'video' ? 2 : 1)) {
        return { isEmbeddable: true, embedProvider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
      }
    }
    return absent;
  } catch { return absent; }
};

export const commonExportDOMOverride = (url: string): DOMExportOutput => {
  const videoEmbedabilityProps = getVideoEmbedabilityProps(url);

  if (videoEmbedabilityProps.isEmbeddable) {
    const container = document.createElement('span');
    const iframeEL = document.createElement('iframe');

    container.setAttribute(
      'data-extended-link-node-data',
      url,
    );

    container.classList.add('hide-span-child');

    iframeEL.src = videoEmbedabilityProps.embedUrl;
    iframeEL.classList.add('fable-video-embed-frame');

    container.appendChild(iframeEL);

    return { element: container };
  }

  const anchorEl = document.createElement('a');

  anchorEl.setAttribute('href', url);
  anchorEl.setAttribute('target', '_blank');
  anchorEl.setAttribute('rel', 'noopener noreferrer');
  anchorEl.setAttribute('classname', 'editor-link');

  return { element: anchorEl };
};
