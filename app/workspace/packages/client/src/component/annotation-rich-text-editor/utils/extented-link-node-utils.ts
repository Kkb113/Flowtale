import { DOMExportOutput } from 'lexical';

const isYoutubeUrl = (url: string): boolean => {
  const REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return REGEX.test(url);
};

const convertYoutubeToEmbedUrl = (url: string): string => {
  // eslint-disable-next-line no-useless-escape
  const REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([^&=%\?]{11})/;

  const match = url.match(REGEX);

  if (match && match[1]) {
    const videoId = match[1];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return '';
};

const isLoomUrl = (url: string): boolean => {
  const REGEX = /^(https?:\/\/)?(www\.)?loom\.com\/.+$/;
  return REGEX.test(url);
};

const convertLoomToEmbedUrl = (url: string): string => {
  // eslint-disable-next-line no-useless-escape
  const REGEX = /^(https?:\/\/)?(www\.)?loom\.com\/share\/([^&=%\?]+)$/;

  const match = url.match(REGEX);

  if (match && match[3]) {
    const videoId = match[3];
    return `https://www.loom.com/embed/${videoId}`;
  }

  return '';
};

const isVimeoUrl = (url: string): boolean => {
  const REGEX = /^(https?:\/\/)?(www\.)?(player\.)?vimeo\.com\/(video\/\d+|.+)$/;
  return REGEX.test(url);
};

const convertVimeoToEmbedUrl = (url: string): string => {
  const REGEX = /^(https?:\/\/)?(www\.)?(player\.)?vimeo\.com\/(video\/)?(\d+)$/;

  const match = url.match(REGEX);

  if (match && match[5]) {
    const videoId = match[5];
    return `https://player.vimeo.com/video/${videoId}`;
  }

  return '';
};

export const getVideoEmbedabilityProps = (url: string): {
  isEmbeddable: boolean;
  embedProvider: 'youtube' | 'loom' | 'vimeo' | null;
  embedUrl: string;
} => {
  if (isYoutubeUrl(url)) {
    return {
      isEmbeddable: true,
      embedProvider: 'youtube',
      embedUrl: convertYoutubeToEmbedUrl(url),
    };
  }

  if (isLoomUrl(url)) {
    return {
      isEmbeddable: true,
      embedProvider: 'loom',
      embedUrl: convertLoomToEmbedUrl(url),
    };
  }

  if (isVimeoUrl(url)) {
    return {
      isEmbeddable: true,
      embedProvider: 'vimeo',
      embedUrl: convertVimeoToEmbedUrl(url),
    };
  }

  return {
    isEmbeddable: false,
    embedProvider: null,
    embedUrl: ''
  };
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
