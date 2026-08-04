"use client";

import { useLayoutEffect, useRef, useState } from "react";

// One tooltip per dashboard; charts call show(content, clientX, clientY).
// An optional avoid range ({left, right} in client coords) keeps the tip
// clear of a highlighted region — it sits to the right of it, flipping
// to the left when there's no room.
export function useTooltip() {
  const [tip, setTip] = useState(null);
  return {
    tip,
    show: (content, x, y, avoid) => setTip({ content, x, y, avoid }),
    hide: () => setTip(null),
  };
}

export function Tooltip({ tip }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let left;
    if (tip.avoid) {
      left = tip.avoid.right + 10;
      if (left + r.width > window.innerWidth - 8) {
        left = tip.avoid.left - r.width - 10;
      }
      left = Math.max(8, left);
    } else {
      left = Math.min(tip.x + 14, window.innerWidth - r.width - 8);
    }
    setPos({
      left,
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
