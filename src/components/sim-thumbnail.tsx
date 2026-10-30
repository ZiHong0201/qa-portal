"use client";

import { useState } from "react";

/**
 * A simulation's screenshot that removes itself if it fails to load, so
 * whatever is drawn behind it shows instead of a broken-image icon.
 */
export function SimThumbnail({ src, className }: { src: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      // An image that failed before the page hydrated fired its error event
      // with no one listening; this catches it when the element is attached.
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
      className={className}
    />
  );
}
