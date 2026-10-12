"use client";

import Image from "next/image";
import React, { useState } from "react";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";
import type { AppOption } from "@/lib/pack";

type AppLogoProps = {
    app: AppOption;
    /** Rendered size in px, for the image's sizes hint. */
    size: number;
    className?: string;
    priority?: boolean;
};

/** An app's logo, or its initial on a brand tile if the file cannot load. */
export default function AppLogo({
    app,
    size,
    className,
    priority,
}: AppLogoProps) {
    const [failedId, setFailedId] = useState<string | null>(null);

    if (failedId === app.id) {
        return (
            <span
                aria-hidden="true"
                data-logo-fallback
                className={cn(
                    "font-heading bg-brand-100 text-brand grid h-full w-full place-items-center font-semibold",
                    className,
                )}
                style={{ fontSize: Math.round(size * 0.42) }}
            >
                {app.name.trim().charAt(0).toUpperCase()}
            </span>
        );
    }

    return (
        <Image
            src={getAssetUrl(`/app-logos/${app.id}.jpg`)}
            alt=""
            width={size}
            height={size}
            sizes={`${size}px`}
            priority={priority}
            onError={() => setFailedId(app.id)}
            className={cn(
                "bg-layer block h-full w-full object-cover",
                className,
            )}
        />
    );
}
