"use client";

import Link from "next/link";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import CategoryPickers from "@/components/CategoryPickers";
import ExportButton from "@/components/ExportButton";
import ExportFeedback from "@/components/ExportFeedback";
import PackPreview from "@/components/PackPreview";
import SiteFooter, { footerLinkClassName } from "@/components/SiteFooter";
import { ArrowLeftIcon, ResetIcon, SearchIcon } from "@/components/icons";
import data from "../../data/apps.json";
import { usePackImage } from "@/hooks/use-pack-image";
import { useTapToOpen } from "@/hooks/use-tap-to-open";
import {
    PACK_STORAGE_KEY,
    clearPrivateAlternatives,
    createInitialPack,
    getSelectedPack,
    hasPicks,
    matchesFilter,
    restorePack,
    selectMainstreamApp,
    serializePack,
    sortByName,
    sortCategories,
    togglePrivateAlternative,
    type AppOption,
} from "@/lib/pack";
import { downloadImage, shareImage } from "@/lib/share-image";
import { CATALOG_REPO_URL } from "@/lib/site";

const categories = sortCategories(data.categories);
const categoriesByName = new Map(
    categories.map((category) => [category.name, category]),
);
const sortedOptions = new Map(
    categories.map((category) => [
        category.name,
        {
            mainstreamApps: sortByName(category.mainstream_apps),
            privateAlternatives: sortByName(category.private_alternatives),
        },
    ]),
);

const EXPORT_FAILED = "Export failed. Please try again.";
const SYSTEM_FONT_NOTICE =
    "The Alternative Pack fonts didn't load, so this image uses a system font.";

function readSavedPack() {
    try {
        return JSON.parse(localStorage.getItem(PACK_STORAGE_KEY) ?? "null");
    } catch {
        // Storage can be unavailable (private mode) or hold something else.
        return null;
    }
}

type ActionMessage = { type: "status" | "error"; text: string };

const isRendered = (element: HTMLElement | null) =>
    element !== null && element.getClientRects().length > 0;

export default function App() {
    const [pack, setPack] = useState(() => createInitialPack(categories));
    // Saved picks are restored after the first render, which the static
    // export prerenders without them.
    const [restored, setRestored] = useState(false);
    const [filter, setFilter] = useState("");
    // Only one picker can be open. Image capture waits while one is.
    const [openKey, setOpenKey] = useState<string | null>(null);
    const currentOpenKey = useRef<string | null>(null);

    const selectedPack = getSelectedPack(pack);
    const canExport = selectedPack.length > 0;
    const exportKey = canExport ? JSON.stringify(selectedPack) : null;
    const currentExportKey = useRef(exportKey);
    const {
        image: readyImage,
        isPreparing,
        failed: preparationFailed,
        usesSystemFont,
        retry,
    } = usePackImage(exportKey, openKey !== null);

    const [isSharing, setIsSharing] = useState(false);
    const [actionMessage, setActionMessage] = useState<ActionMessage | null>(
        null,
    );
    const [retryPending, setRetryPending] = useState(false);
    const shareSidebarRef = useRef<HTMLButtonElement>(null);
    const shareMobileRef = useRef<HTMLButtonElement>(null);
    const exportBarRef = useRef<HTMLDivElement>(null);
    // Space open menus leave for the mobile bar, so a tap aimed at Share
    // cannot land on a menu item. 0 when the bar is hidden or static, and
    // on short screens, where a menu needs every pixel to stay usable.
    const [menuBottomReserve, setMenuBottomReserve] = useState(0);
    // Short screens clip long feedback in the bar into a small scroller.
    const [shortScreen, setShortScreen] = useState(false);

    useEffect(() => {
        const saved = readSavedPack();
        // A deliberate re-render after hydration, with the saved picks.
        /* eslint-disable react-hooks/set-state-in-effect */
        if (saved) setPack(restorePack(categories, saved));
        setRestored(true);
        /* eslint-enable react-hooks/set-state-in-effect */
    }, []);

    useEffect(() => {
        if (!restored) return;
        try {
            // Nothing is stored until something is picked, or after Reset.
            if (hasPicks(pack, categories)) {
                localStorage.setItem(
                    PACK_STORAGE_KEY,
                    JSON.stringify(serializePack(pack)),
                );
            } else {
                localStorage.removeItem(PACK_STORAGE_KEY);
            }
        } catch {
            // Without storage, picks last for this visit.
        }
    }, [pack, restored]);

    useEffect(() => {
        currentOpenKey.current = openKey;
        currentExportKey.current = exportKey;
    }, [openKey, exportKey]);

    useEffect(() => {
        const bar = exportBarRef.current;
        if (!bar) return;
        const root = document.documentElement;
        const shortQuery = window.matchMedia("(max-height: 30rem)");
        const update = () => {
            const height = bar.getBoundingClientRect().height;
            // Feedback and safe-area padding can make the bar taller than
            // the buttons alone. Leave at least half the viewport for editing.
            // The CSS thresholds cover the first paint before measurement.
            bar.style.position =
                height > window.innerHeight / 2 ? "static" : "";
            const sticky = getComputedStyle(bar).position === "sticky";
            setMenuBottomReserve(shortQuery.matches || !sticky ? 0 : height);
            setShortScreen(shortQuery.matches);
            // Keep focused pickers scrolled clear of the bar, which grows
            // while it shows a message (globals.css covers the first paint).
            // A bar left at the end of the page covers nothing.
            root.style.scrollPaddingBottom =
                height && sticky ? `${height}px` : "0px";
        };
        const observer = new ResizeObserver(update);
        observer.observe(bar);
        // The bar can stop sticking without changing size.
        window.addEventListener("resize", update);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", update);
            bar.style.position = "";
            root.style.scrollPaddingBottom = "";
        };
    }, []);

    // Keep the Retry button mounted until its capture settles. If it still
    // has focus when the image is ready, hand focus to the Share button
    // rather than letting it fall back to the page.
    useLayoutEffect(() => {
        if (!retryPending || (!readyImage && !preparationFailed)) return;

        if (
            readyImage &&
            document.activeElement?.closest("[data-export-feedback]")
        ) {
            const share = [
                shareSidebarRef.current,
                shareMobileRef.current,
            ].find(isRendered);
            share?.focus();
        }
        // A deliberate re-render before paint: Retry unmounts only after
        // focus has moved off it.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRetryPending(false);
    }, [retryPending, readyImage, preparationFailed]);

    const getTriggerHandlers = useTapToOpen(openKey, (key) => {
        if (key !== null) setActionMessage(null);
        setOpenKey(key);
    });

    const handleOpenChange = (key: string, open: boolean) => {
        if (open) {
            setActionMessage(null);
            setRetryPending(false);
        }
        // A closing menu must not close another picker that just opened.
        setOpenKey((current) =>
            open ? key : current === key ? null : current,
        );
    };

    // Reaching for Share or Download ends editing, so preparation can start.
    // Touch dismissal would otherwise wait for a click that a disabled
    // button never sends, leaving the menu open and the image unprepared.
    const closePicker = () => {
        if (openKey !== null) setOpenKey(null);
    };

    const handleCloseAutoFocus = (event: Event, key: string) => {
        // A closing animation can finish after another picker opens. Its
        // focus restoration must not steal focus from that active picker.
        if (currentOpenKey.current !== null && currentOpenKey.current !== key) {
            event.preventDefault();
        }
    };

    const updatePack = (update: (current: typeof pack) => typeof pack) => {
        setPack(update);
        setActionMessage(null);
        setRetryPending(false);
    };

    const handleSelectMainstreamApp = (category: string, app: AppOption) => {
        updatePack((current) => selectMainstreamApp(current, category, app));
        setOpenKey(null);
    };

    const handleTogglePrivateAlternative = (
        category: string,
        app: AppOption,
    ) => {
        updatePack((current) =>
            togglePrivateAlternative(current, category, app),
        );
    };

    const handleClearPrivateAlternatives = (category: string) => {
        updatePack((current) => clearPrivateAlternatives(current, category));
        setOpenKey(null);
    };

    const handleFilterChange = (value: string) => {
        setFilter(value);
        setOpenKey(null);
    };

    const handleReset = () => {
        if (!window.confirm("Reset all picks? Your pack will be cleared.")) {
            return;
        }
        updatePack(() => createInitialPack(categories));
        setOpenKey(null);
    };

    const handleRetry = () => {
        setActionMessage(null);
        setRetryPending(true);
        retry();
    };

    const runDownload = () => {
        if (!readyImage || isSharing) {
            return;
        }

        setActionMessage(null);
        try {
            downloadImage(readyImage);
        } catch (error) {
            console.error(error);
            setActionMessage({ type: "error", text: EXPORT_FAILED });
        }
    };

    const runShare = async () => {
        if (!readyImage || isSharing) {
            return;
        }

        const sharedKey = exportKey;
        setActionMessage(null);
        setIsSharing(true);
        try {
            // shareImage reaches navigator.share before its first await, so
            // the share sheet still has this tap's activation.
            const result = await shareImage(readyImage);
            if (currentExportKey.current !== sharedKey) return;

            if (result === "copied") {
                setActionMessage({
                    type: "status",
                    text: "Image copied to clipboard.",
                });
            }

            if (result === "downloaded") {
                setActionMessage({
                    type: "status",
                    text: "Sharing is unavailable here, so the PNG was downloaded.",
                });
            }
        } catch (error) {
            console.error(error);
            if (currentExportKey.current === sharedKey) {
                setActionMessage({ type: "error", text: EXPORT_FAILED });
            }
        } finally {
            setIsSharing(false);
        }
    };

    const showRetry = preparationFailed || retryPending;
    const feedback = {
        status:
            actionMessage?.type === "status"
                ? actionMessage.text
                : usesSystemFont
                  ? SYSTEM_FONT_NOTICE
                  : null,
        error: showRetry
            ? EXPORT_FAILED
            : actionMessage?.type === "error"
              ? actionMessage.text
              : null,
        retry: showRetry
            ? {
                  pending: retryPending && !readyImage && !preparationFailed,
                  onRetry: handleRetry,
              }
            : null,
    };
    const exportButtonState = {
        disabled: !readyImage,
        blocked: isSharing,
        preparing: isPreparing,
        canExport,
    };

    const visibleItems = pack.filter((item) =>
        matchesFilter(categoriesByName.get(item.category)!, filter),
    );
    const switchCount = selectedPack.length;

    return (
        <div className="flex min-h-dvh w-full flex-col">
            <main className="mx-auto w-[min(81rem,calc(100%-2.5rem))] pt-10 pb-16 max-sm:w-[calc(100%-2rem)] max-sm:pt-6">
                <Link
                    href="/"
                    className="text-caption hover:text-brand inline-flex items-center gap-1.5 text-sm font-medium no-underline transition-colors"
                >
                    <ArrowLeftIcon className="size-[18px]" />
                    Home
                </Link>

                <header className="mt-[clamp(2rem,9vh,6rem)] mb-10 max-w-[47.5rem]">
                    <p className="text-brand mb-4 inline-flex items-center gap-2.5 text-[0.8125rem] font-medium tracking-[0.08em] uppercase">
                        <span
                            aria-hidden="true"
                            className="bg-brand size-2 rounded-full shadow-[0_0_0_4px_rgb(0_204_170/18%)]"
                        />
                        Generator
                    </p>
                    <h1 className="font-heading text-[clamp(2.125rem,5.4vw,3.5rem)] leading-[1.1] font-semibold tracking-[-0.02em] break-words hyphens-auto">
                        Create your{" "}
                        <span className="text-brand">Alternative Pack</span>
                    </h1>
                    <p className="text-caption mt-[1.125rem] max-w-[38.75rem] text-[1.0625rem]">
                        Pick the mainstream apps you used before, choose up to
                        three alternative tools you switched to, and share your
                        pack as an image.
                    </p>
                </header>

                <div className="wide:grid-cols-[minmax(0,1fr)_21.25rem] grid grid-cols-1 items-start gap-6">
                    <section aria-labelledby="categories-title">
                        <div className="mb-4 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
                            <h2
                                id="categories-title"
                                className="font-heading text-lg font-semibold"
                            >
                                Categories
                            </h2>
                            <label className="border-line bg-layer text-caption focus-within:border-brand flex h-11 w-[min(20rem,100%)] items-center gap-2 rounded-xl border px-3.5 transition-colors max-sm:w-full">
                                <span className="sr-only">
                                    Filter categories and apps
                                </span>
                                <SearchIcon className="size-5" />
                                <input
                                    id="filter-input"
                                    type="search"
                                    value={filter}
                                    onChange={(event) =>
                                        handleFilterChange(event.target.value)
                                    }
                                    placeholder="Filter categories or apps"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="text-heading placeholder:text-subtle min-w-0 flex-1 border-0 bg-transparent text-sm outline-0"
                                />
                            </label>
                        </div>
                        {visibleItems.length === 0 && (
                            <p className="border-line text-caption rounded-[18px] border border-dashed p-8 text-center">
                                No category matches your filter.
                            </p>
                        )}
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3">
                            {visibleItems.map((item) => (
                                <CategoryPickers
                                    key={item.category}
                                    item={item}
                                    {...sortedOptions.get(item.category)!}
                                    openKey={openKey}
                                    onOpenChange={handleOpenChange}
                                    onCloseAutoFocus={handleCloseAutoFocus}
                                    getTriggerHandlers={getTriggerHandlers}
                                    onSelectMainstreamApp={
                                        handleSelectMainstreamApp
                                    }
                                    onTogglePrivateAlternative={
                                        handleTogglePrivateAlternative
                                    }
                                    onClearPrivateAlternatives={
                                        handleClearPrivateAlternatives
                                    }
                                    menuCollisionPadding={{
                                        bottom: menuBottomReserve,
                                    }}
                                />
                            ))}
                        </div>
                    </section>

                    <aside
                        aria-labelledby="pack-title"
                        className="wide:sticky wide:top-6 flex flex-col gap-3.5"
                    >
                        <div className="border-line bg-layer flex flex-col gap-4 rounded-[18px] border p-[18px]">
                            <div className="flex items-center justify-between gap-3">
                                <h2
                                    id="pack-title"
                                    className="font-heading text-lg font-semibold"
                                >
                                    Your pack
                                </h2>
                                <span
                                    id="pack-count"
                                    className="border-brand/30 bg-brand/12 text-brand shrink-0 rounded-full border px-[9px] py-[3px] text-xs leading-[1.4] font-medium"
                                >
                                    {switchCount === 1
                                        ? "1 switch"
                                        : `${switchCount} switches`}
                                </span>
                            </div>

                            <div className="border-line-soft bg-page wide:max-w-none mx-auto aspect-square w-full max-w-[32.5rem] overflow-hidden rounded-xl border">
                                <PackPreview
                                    pack={selectedPack}
                                    className="block h-full w-full"
                                />
                            </div>

                            <div
                                onPointerDownCapture={closePicker}
                                className="wide:grid hidden grid-cols-2 gap-2"
                            >
                                <ExportButton
                                    ref={shareSidebarRef}
                                    action="share"
                                    tone="primary"
                                    placement="sidebar"
                                    onClick={runShare}
                                    busy={isSharing}
                                    {...exportButtonState}
                                />
                                <ExportButton
                                    action="download"
                                    tone="secondary"
                                    placement="sidebar"
                                    onClick={runDownload}
                                    {...exportButtonState}
                                />
                            </div>

                            {/* Only one copy of the feedback is displayed, so
                                only one is announced. */}
                            <ExportFeedback
                                {...feedback}
                                placement="sidebar"
                                className={`wide:block hidden ${
                                    feedback.status || feedback.error
                                        ? "-mt-1.5"
                                        : "-mt-4"
                                }`}
                            />

                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={!hasPicks(pack, categories)}
                                className="text-caption enabled:hover:text-heading inline-flex cursor-pointer items-center justify-center gap-1.5 self-center p-1 text-[0.8125rem] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ResetIcon className="size-4" />
                                Reset all picks
                            </button>
                        </div>

                        <SiteFooter
                            extra={
                                <a
                                    href={`${CATALOG_REPO_URL}#add-a-missing-app`}
                                    target="_blank"
                                    rel="noopener"
                                    className={footerLinkClassName}
                                >
                                    Add a missing app
                                </a>
                            }
                        />
                    </aside>
                </div>
            </main>

            {/* Sticky in the page flow, so it never covers the end of the
                page and grows with its feedback. Where its buttons would take
                half the screen (a larger default font on a short screen), it
                stays at the end of the page instead, as in globals.css. */}
            <div
                ref={exportBarRef}
                onPointerDownCapture={closePicker}
                className="border-line-soft wide:hidden sticky bottom-0 z-40 mt-auto border-t bg-[rgb(17_19_23/92%)] px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md max-sm:px-4 [@media(max-height:10rem)]:static [@media(max-height:17.5rem)_and_(max-width:15.999rem)]:static"
            >
                <ExportFeedback
                    {...feedback}
                    placement="mobile"
                    messageClassName="mb-2.5"
                    // On short screens a long message scrolls inside the bar
                    // rather than covering the page.
                    textClassName="[@media(max-height:30rem)]:block [@media(max-height:30rem)]:max-h-10 [@media(max-height:30rem)]:overflow-y-auto"
                    scrollableText={shortScreen}
                />
                <div className="grid grid-cols-1 gap-2 min-[16rem]:grid-cols-2">
                    <ExportButton
                        ref={shareMobileRef}
                        action="share"
                        tone="primary"
                        placement="mobile"
                        onClick={runShare}
                        busy={isSharing}
                        {...exportButtonState}
                    />
                    <ExportButton
                        action="download"
                        tone="secondary"
                        placement="mobile"
                        onClick={runDownload}
                        {...exportButtonState}
                    />
                </div>
            </div>
        </div>
    );
}
