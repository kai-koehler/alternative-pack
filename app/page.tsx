import Link from "next/link";
import React from "react";
import PackPreview from "@/components/PackPreview";
import SiteFooter from "@/components/SiteFooter";
import { ArrowRightIcon, BrandMark } from "@/components/icons";
import data from "../data/apps.json";
import { getSelectedPack, restorePack, sortCategories } from "@/lib/pack";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// An example pack for the home page, drawn like a real export.
const examplePack = getSelectedPack(
    restorePack(sortCategories(data.categories), {
        Mail: { main: "gmail", alts: ["proton_mail"] },
        Photos: { main: "google_photos", alts: ["ente_photos"] },
        Search: { main: "google_search", alts: ["duckduckgo"] },
        Browser: { main: "chrome", alts: ["firefox", "brave"] },
        Messaging: { main: "whatsapp", alts: ["signal"] },
        Drive: { main: "google_drive", alts: ["nextcloud"] },
    }),
);

export default function Home() {
    return (
        <div className="mx-auto flex min-h-dvh w-[min(81rem,calc(100%-2.5rem))] flex-col pt-10 pb-12 max-sm:w-[calc(100%-2rem)] max-sm:pt-6">
            <header className="flex items-center gap-3">
                <BrandMark className="size-8" />
                <span className="font-heading text-lg font-semibold">
                    {SITE_NAME}
                </span>
            </header>

            <main className="wide:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] my-auto grid grid-cols-1 items-center gap-12 py-16">
                <div className="max-w-[40rem]">
                    <p className="text-brand mb-4 inline-flex items-center gap-2.5 text-[0.8125rem] font-medium tracking-[0.08em] uppercase">
                        <span
                            aria-hidden="true"
                            className="bg-brand size-2 rounded-full shadow-[0_0_0_4px_rgb(0_204_170/18%)]"
                        />
                        Generator
                    </p>
                    <h1 className="font-heading text-[clamp(2.125rem,5.4vw,3.5rem)] leading-[1.1] font-semibold tracking-[-0.02em] break-words hyphens-auto">
                        Your switches to{" "}
                        <span className="text-brand">alternative apps</span>, in
                        one image
                    </h1>
                    <p className="text-caption mt-[1.125rem] text-[1.0625rem]">
                        {SITE_DESCRIPTION}
                    </p>
                    <Link
                        href="/create"
                        id="create-pack"
                        className="font-heading bg-brand text-page hover:bg-brand-hover mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-[0.9375rem] font-semibold transition-colors"
                    >
                        Create your pack
                        <ArrowRightIcon className="size-[18px]" />
                    </Link>
                </div>

                <div className="border-line bg-layer wide:max-w-none mx-auto w-full max-w-[32.5rem] rounded-[18px] border p-[18px]">
                    <div className="border-line-soft bg-page aspect-square overflow-hidden rounded-xl border">
                        <PackPreview
                            pack={examplePack}
                            label="Example of an Alternative Pack image"
                            className="block h-full w-full"
                        />
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
