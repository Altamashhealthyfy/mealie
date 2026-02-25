import React, { useState, useEffect } from "react";

/**
 * Renders images that may require authentication (e.g. base44 private file URLs).
 * Falls back to a placeholder if the image fails to load.
 */
export default function AuthenticatedImage({ src, alt, className, fallback = null, onError }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const isExternalUrl = src && !src.includes('/api/apps/') && !src.includes('base44.app/api');

  useEffect(() => {
    if (!src) {
      setFailed(true);
      return;
    }

    let objectUrl = null;

    // If it's a base44 internal API URL, fetch with credentials
    if (!isExternalUrl) {
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
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, isExternalUrl]);

  if (failed || !src) {
    return fallback || null;
  }

  // For external URLs, render immediately; for internal, wait for blobUrl
  const imageSrc = isExternalUrl ? src : blobUrl;
  if (!imageSrc) return fallback || null;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}