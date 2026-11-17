// PartImageThumb.tsx — individual part image thumbnail with click-to-enlarge preview.
// Shows a neutral placeholder when the part has no image (or the file is missing).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaCamera, FaTimes } from "react-icons/fa";
import { resolveMediaUrl } from "../utils/media";
import "./partImage.css";

export function PartImageThumb({
  path, alt, size = 44, caption,
}: {
  path?: string | null;
  alt: string;
  size?: number;
  caption?: string;
}) {
  const url = resolveMediaUrl(path);
  // Remember which URL failed, so a new image path automatically gets a fresh attempt.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const broken = brokenUrl !== null && brokenUrl === url;
  const [open, setOpen] = useState(false);

  if (!url || broken) {
    return (
      <span className="pi-thumb pi-thumb--empty" style={{ width: size, height: size }} title="No image available">
        <FaCamera />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="pi-thumb"
        style={{ width: size, height: size }}
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title="Click to enlarge"
      >
        <img src={url} alt={alt} loading="lazy" onError={() => setBrokenUrl(url)} />
      </button>
      {open && <ImageLightbox url={url} alt={alt} caption={caption ?? alt} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ImageLightbox({ url, alt, caption, onClose }: { url: string; alt: string; caption?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="pi-lightbox" onClick={e => { e.stopPropagation(); onClose(); }} role="dialog" aria-label={alt}>
      <button type="button" className="pi-lightbox__close" onClick={onClose} aria-label="Close"><FaTimes /></button>
      <figure className="pi-lightbox__fig" onClick={e => e.stopPropagation()}>
        <img src={url} alt={alt} />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </div>,
    document.body,
  );
}
