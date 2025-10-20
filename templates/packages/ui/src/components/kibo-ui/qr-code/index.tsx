"use client";

import { formatHex, oklch } from "culori";
import QR from "qrcode";
import { type HTMLAttributes, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type QRCodeProps = HTMLAttributes<HTMLDivElement> & {
  data: string;
  foreground?: string;
  background?: string;
  robustness?: "L" | "M" | "Q" | "H";
};

const oklchRegex = /oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/;

const getOklch = (color: string, fallback: [number, number, number]) => {
  const match = color.match(oklchRegex);

  if (!match) {
    return { l: fallback[0], c: fallback[1], h: fallback[2] };
  }

  const [, lMatch, cMatch, hMatch] = match;

  if (!lMatch || !cMatch || !hMatch) {
    return { l: fallback[0], c: fallback[1], h: fallback[2] };
  }

  return {
    l: Number.parseFloat(lMatch),
    c: Number.parseFloat(cMatch),
    h: Number.parseFloat(hMatch),
  };
};

export const QRCode = ({
  data,
  foreground,
  background,
  robustness = "M",
  className,
  ...props
}: QRCodeProps) => {
  const [svg, setSVG] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const styles = getComputedStyle(document.documentElement);
        const foregroundColor = foreground ?? styles.getPropertyValue("--foreground");
        const backgroundColor = background ?? styles.getPropertyValue("--background");

        const foregroundOklch = getOklch(foregroundColor, [0.21, 0.006, 285.885]);
        const backgroundOklch = getOklch(backgroundColor, [0.985, 0, 0]);

        const newSvg = await QR.toString(data, {
          type: "svg",
          color: {
            dark: formatHex(oklch({ mode: "oklch", ...foregroundOklch })),
            light: formatHex(oklch({ mode: "oklch", ...backgroundOklch })),
          },
          width: 200,
          errorCorrectionLevel: robustness,
          margin: 0,
        });

        setSVG(newSvg);
      } catch (_err) {}
    };

    generateQR();
  }, [data, foreground, background, robustness]);

  if (!svg) {
    return null;
  }

  return (
    <div
      className={cn("size-full", "[&_svg]:size-full", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required for SVG"
      dangerouslySetInnerHTML={{ __html: svg }}
      {...props}
    />
  );
};
