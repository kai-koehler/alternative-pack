import Link from "next/link";
import React from "react";
import { IMPRINT_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const footerLinkClassName =
    "text-caption hover:text-brand underline underline-offset-[3px]";

/** Credits for Ente's catalog, and the legal links. */
export default function SiteFooter({
    extra,
    className,
}: {
    /** Another link, set after the credits. */
    extra?: React.ReactNode;
    className?: string;
}) {
    return (
        <footer
            className={cn(
                "text-subtle flex flex-col gap-3.5 px-1 text-xs",
                className,
            )}
        >
            <p>
                App catalog and logos from{" "}
                <a
                    href="https://privacypack.org"
                    target="_blank"
                    rel="noopener"
                    className={footerLinkClassName}
                >
                    PrivacyPack
                </a>{" "}
                by Ente (
                <a
                    href="https://github.com/ente/privacypack/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener"
                    className={footerLinkClassName}
                >
                    MIT
                </a>
                ).
                {extra && <> {extra}</>}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
                <span>&copy; 2026 Kai Köhler</span>
                <a href={IMPRINT_URL} className={footerLinkClassName}>
                    Imprint
                </a>
                <Link href="/privacy" className={footerLinkClassName}>
                    Privacy
                </Link>
                <Link href="/terms" className={footerLinkClassName}>
                    Terms
                </Link>
            </p>
        </footer>
    );
}
