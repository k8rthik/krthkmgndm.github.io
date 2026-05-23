"use client";

import { useState, useEffect, useRef } from "react";
import Folduzz from "./demos/Folduzz";
import DrActive from "./demos/DrActive";
import BioScrolls from "./demos/BioScrolls";

const DEMOS = {
  folduzz: Folduzz,
  "dr.active": DrActive,
  BioScrolls: BioScrolls,
};

export default function ProjectDemo({ name, children }) {
  const Demo = DEMOS[name] || null;
  const [active, setActive] = useState(false);
  const rowRef = useRef(null);

  useEffect(() => {
    if (!Demo) return;
    const row = rowRef.current;
    if (!row) return;
    const enter = () => setActive(true);
    const leave = () => setActive(false);
    row.addEventListener("pointerenter", enter);
    row.addEventListener("pointerleave", leave);
    row.addEventListener("focusin", enter);
    row.addEventListener("focusout", leave);
    return () => {
      row.removeEventListener("pointerenter", enter);
      row.removeEventListener("pointerleave", leave);
      row.removeEventListener("focusin", enter);
      row.removeEventListener("focusout", leave);
    };
  }, [Demo]);

  return (
    <div ref={rowRef} className={Demo ? "project-row" : undefined}>
      {children}
      {Demo ? <Demo active={active} /> : null}
    </div>
  );
}
