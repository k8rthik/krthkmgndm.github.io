"use client";

import { useLayoutEffect, useRef, useState } from "react";

// One tooltip per dashboard; charts call show(content, clientX, clientY).
export function useTooltip() {
  const [tip, setTip] = useState(null);
  return {
    tip,
    show: (content, x, y) => setTip({ content, x, y }),
    hide: () => setTip(null),
  };
}

export function Tooltip({ tip }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      left: Math.min(tip.x + 14, window.innerWidth - r.width - 8),
      top: Math.max(
        8,
        Math.min(tip.y - r.height / 2, window.innerHeight - r.height - 8),
      ),
    });
  }, [tip]);

  if (!tip) return null;
  return (
    <div className="elo-tip" ref={ref} style={pos} role="presentation">
      {tip.content}
    </div>
  );
}
