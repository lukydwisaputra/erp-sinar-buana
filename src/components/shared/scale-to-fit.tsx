"use client";
import * as React from "react";

/**
 * Scales a fixed-width child (e.g. a 210mm A4 page) down to fit the available
 * container width, preserving aspect ratio. The child keeps its true A4
 * resolution; only a CSS transform shrinks it visually so it never overflows.
 *
 * `baseWidth` is the child's natural width in px (210mm ≈ 794px at 96dpi).
 */
export function ScaleToFit({
  baseWidth = 794,
  children,
}: {
  baseWidth?: number;
  children: React.ReactNode;
}) {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [height, setHeight] = React.useState<number>();

  React.useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const available = outer.clientWidth;
      const s = Math.min(1, available / baseWidth);
      setScale(s);
      // transform doesn't affect layout box, so scrollHeight is the unscaled height
      setHeight(inner.scrollHeight * s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [baseWidth]);

  return (
    <div ref={outerRef} className="w-full overflow-hidden" style={{ height }}>
      <div
        ref={innerRef}
        style={{ width: baseWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}
