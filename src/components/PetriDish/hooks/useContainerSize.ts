import { useState, useCallback, useEffect } from "react";

export function useContainerSize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  initialWidth: number,
  initialHeight: number
) {
  const [containerSize, setContainerSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: rect.width || initialWidth,
        height: rect.height || initialHeight,
      });
    }
  }, [initialWidth, initialHeight, containerRef]);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  return containerSize;
} 