import React, { useState, useEffect } from "react";

/**
 * Renders images that may require authentication (e.g. base44 private file URLs).
 * Falls back to a placeholder if the image fails to load.
 */
export default function AuthenticatedImage({ src, alt, className, fallback = null, onError }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setFailed(true);
      return;
    }

    let objectUrl = null;

    // If it's a base44 internal API URL, fetch with credentials
    if (src.includes('/api/apps/') || src.includes('base44.app/api')) {
      fetch(src, { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('Failed');
          return res.blob();
        })
        .then(blob => {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        })
        .catch(() => {
          setFailed(true);
          onError?.();
        });
    } else {
      // External URL — use directly
      setBlobUrl(src);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed || (!blobUrl && !src)) {
    return fallback || null;
  }

  if (!blobUrl) return null; // Still loading

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}