import { Loader2 } from "lucide-react";
import React from "react";
import { DownloadIcon, ShareIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const ACTIONS = {
    share: {
        Icon: ShareIcon,
        label: "Share",
        title: "Share your Alternative Pack",
    },
    download: {
        Icon: DownloadIcon,
        label: "Download PNG",
        title: "Download your Alternative Pack",
    },
};

const TONES = {
    primary:
        "bg-brand text-page enabled:hover:bg-brand-hover aria-disabled:hover:bg-brand",
    secondary:
        "border-line bg-layer-2 text-heading enabled:hover:border-brand aria-disabled:hover:border-line",
};

const PLACEMENTS = {
    sidebar: { shortLabel: false },
    // The bar is narrow on phones, so Download drops "PNG".
    mobile: { shortLabel: true },
};

type ExportButtonProps = {
    ref?: React.Ref<HTMLButtonElement>;
    action: keyof typeof ACTIONS;
    tone: keyof typeof TONES;
    placement: keyof typeof PLACEMENTS;
    onClick: () => void;
    /** No image is ready for the current selection. */
    disabled: boolean;
    /**
     * Another export is running. This uses aria-disabled rather than
     * disabled, so a button that has focus keeps it.
     */
    blocked: boolean;
    /** The share sheet (or its fallback) is still running. */
    busy?: boolean;
    preparing: boolean;
    /** At least one alternative is picked, so an image can be prepared. */
    canExport: boolean;
};

export default function ExportButton({
    ref,
    action,
    tone,
    placement,
    onClick,
    disabled,
    blocked,
    busy = false,
    preparing,
    canExport,
}: ExportButtonProps) {
    const { Icon, label: fullLabel, title } = ACTIONS[action];
    const label = PLACEMENTS[placement].shortLabel
        ? fullLabel.replace(/ PNG$/, "")
        : fullLabel;
    const spinning = busy || preparing;

    return (
        <button
            ref={ref}
            type="button"
            onClick={() => {
                if (!blocked) onClick();
            }}
            disabled={disabled}
            aria-disabled={blocked || undefined}
            id={`${action}-${placement}`}
            title={
                canExport
                    ? title
                    : "Pick at least one alternative before exporting"
            }
            className={cn(
                "font-heading flex min-h-[2.875rem] min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent px-3.5 text-sm font-semibold transition enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-progress aria-disabled:opacity-70",
                TONES[tone],
            )}
        >
            {spinning ? (
                <Loader2
                    className="size-[18px] animate-spin"
                    aria-hidden="true"
                />
            ) : (
                <Icon className="size-[18px]" />
            )}
            <span>
                {label}
                {preparing ? (
                    <span className="sr-only"> (preparing)</span>
                ) : busy ? (
                    <span className="sr-only"> (sharing)</span>
                ) : null}
            </span>
        </button>
    );
}
