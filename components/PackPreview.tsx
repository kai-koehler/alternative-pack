"use client";

import React, { useEffect, useRef } from "react";
import { renderPackImage } from "@/lib/pack-image";
import type { PackItem } from "@/lib/pack";

// Redraws once a burst of edits settles. The preview is drawn into its own
// canvas; Share and Download use a full-size PNG prepared separately.
const PREVIEW_DELAY_MS = 120;
const PREVIEW_PIXELS = 900;

type PackPreviewProps = {
    pack: PackItem[];
    className?: string;
    label?: string;
};

/** A live, scaled-down drawing of the image Share and Download export. */
export default function PackPreview({
    pack,
    className,
    label = "Preview of your Alternative Pack image",
}: PackPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const packKey = JSON.stringify(pack);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            // Draw offscreen, then copy, so the visible canvas never shows a
            // half-drawn or cleared frame.
            const frame = document.createElement("canvas");
            renderPackImage(frame, JSON.parse(packKey) as PackItem[], {
                pixelSize: PREVIEW_PIXELS,
                signal: controller.signal,
            }).then(
                () => {
                    if (controller.signal.aborted) return;
                    canvas.width = frame.width;
                    canvas.height = frame.height;
                    canvas.getContext("2d")?.drawImage(frame, 0, 0);
                    canvas.dataset.previewReady = "true";
                },
                (error: unknown) => {
                    if (!controller.signal.aborted) console.error(error);
                },
            );
        }, PREVIEW_DELAY_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [packKey]);

    return (
        <canvas
            ref={canvasRef}
            width={PREVIEW_PIXELS}
            height={PREVIEW_PIXELS}
            role="img"
            aria-label={label}
            className={className}
        />
    );
}
