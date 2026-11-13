import React from "react";
import { ensureStyles, useIsoLayoutEffect } from "./styles";

export interface StickerSheetProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** A glossy plastic sheet to lay stickers out on. Purely visual; stickers work without it. */
export function StickerSheet({ children, className, style }: StickerSheetProps) {
  useIsoLayoutEffect(() => { ensureStyles(); }, []);
  return (
    <div className={["pas-sheet", className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}
