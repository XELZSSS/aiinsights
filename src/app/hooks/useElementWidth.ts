import { useEffect, useRef, useState } from "react";

/** Returns a ref to attach plus the element's current content width, tracked via ResizeObserver. */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
    // Observe once for the element's lifetime; the observer reports every resize.
  }, []);

  return [ref, width];
}
