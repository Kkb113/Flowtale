import React, { useState } from 'react';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc: string;
}

/** Keep unavailable optional images from displaying a broken-image icon. */
export default function ImageWithFallback({ src, fallbackSrc, onError, alt = '', ...props }: Props): JSX.Element {
  const [failedSource, setFailedSource] = useState<string>();
  const effectiveSource = !src || failedSource === src ? fallbackSrc : src;
  return (
    <img
      {...props}
      alt={alt}
      src={effectiveSource}
      onError={event => {
        if (effectiveSource !== fallbackSrc) setFailedSource(src);
        onError?.(event);
      }}
    />
  );
}
