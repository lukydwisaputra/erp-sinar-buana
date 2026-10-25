"use client";
import * as React from "react";

// SignaturePad always exports a PNG of exactly this size, so any other
// dimensions mean an uploaded cap image (see signature-template-section).
const PAD_WIDTH = 480;
const PAD_HEIGHT = 160;

/** Crops the transparent / near-white margin around an image, so a cap file
 * with empty padding still sits flush with the edge it is aligned to. Falls
 * back to the original on any failure (or when there is nothing to crop). */
function trimMargin(img: HTMLImageElement): string | null {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (!w || !h) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const empty = data[i + 3] < 12 || (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245);
        if (empty) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0 || (minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1)) return null;
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d")?.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Signature block image. A hand-drawn signature sits centered under
 * "Hormat Kami," (fixed-width invisible bounds, since the ink can be
 * anywhere within its mostly-transparent canvas); an uploaded cap image
 * sits flush with the right edge of the signatory's name instead. */
export function SignatureImage({ src }: { src: string }): React.JSX.Element {
  const [isDrawn, setIsDrawn] = React.useState(false);
  const [trimmed, setTrimmed] = React.useState<{ src: string; url: string } | null>(null);
  const check = React.useCallback((img: HTMLImageElement | null) => {
    if (!img?.complete || img.naturalWidth === 0 || img.src !== src) return;
    const drawn = img.naturalWidth === PAD_WIDTH && img.naturalHeight === PAD_HEIGHT;
    setIsDrawn(drawn);
    if (!drawn) {
      const url = trimMargin(img);
      if (url) setTrimmed((prev) => (prev?.src === src ? prev : { src, url }));
    }
  }, [src]);
  const shownSrc = trimmed?.src === src ? trimmed.url : src;

  return (
    <div className={isDrawn ? "my-2 flex w-40 justify-center" : "my-2 flex justify-end"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={check}
        src={shownSrc}
        alt="Tanda tangan"
        className="h-20 w-auto"
        onLoad={(e) => check(e.currentTarget)}
      />
    </div>
  );
}
