export function Screenshot({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="screenshot">
      {/* eslint-disable-next-line @next/next/no-img-element -- static screenshots, no optimization needed for an internal doc site */}
      <img src={src} alt={caption} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
