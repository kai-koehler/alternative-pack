"use client";

import React, { useRef } from "react";
import AppLogo from "@/components/AppLogo";
import { ArrowRightIcon, ChevronDownIcon, PlusIcon } from "@/components/icons";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { useTapToOpen } from "@/hooks/use-tap-to-open";
import {
    MAX_PRIVATE_ALTERNATIVES,
    getPrivateAlternativeLabel,
    type AppOption,
    type PackItem,
} from "@/lib/pack";
import { nameParts } from "@/lib/name-breaks";
import { cn } from "@/lib/utils";

const triggerClassName =
    "flex h-full w-full min-w-0 cursor-pointer touch-pan-y flex-col items-center gap-2 rounded-xl border border-transparent bg-layer-2 px-2 pt-3.5 pb-2 text-body transition-colors hover:border-brand hover:bg-layer-2-hover focus-visible:border-brand data-[state=open]:border-brand data-[state=open]:bg-layer-2-hover";
const logoFrameClassName =
    "relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-[14px]";
const nameClassName =
    "max-w-full text-center text-[0.8125rem] leading-tight font-medium break-words";
const menuClassName =
    "w-[min(16.25rem,calc(100vw-1.5rem))] rounded-[14px] p-0 shadow-[0_18px_48px_rgb(0_0_0/45%)]";
const menuLabelClassName =
    "bg-popover text-caption border-line-soft sticky top-0 z-10 [@media(max-height:30rem)]:static flex items-center justify-between gap-3 border-b px-3.5 pt-3 pb-2.5 text-xs font-medium";

/** A picker's visible name, which may also wrap at hints in long words. */
function PickerName({ name, className }: { name: string; className?: string }) {
    return (
        <span data-picker-name className={cn(nameClassName, className)}>
            {nameParts(name).map((part, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <wbr />}
                    {part}
                </React.Fragment>
            ))}
        </span>
    );
}

type CategoryPickersProps = {
    item: PackItem;
    /** The category's options, already sorted for display. */
    mainstreamApps: AppOption[];
    privateAlternatives: AppOption[];
    openKey: string | null;
    onOpenChange: (key: string, open: boolean) => void;
    onCloseAutoFocus: (event: Event, key: string) => void;
    getTriggerHandlers: ReturnType<typeof useTapToOpen>;
    onSelectMainstreamApp: (category: string, app: AppOption) => void;
    onTogglePrivateAlternative: (category: string, app: AppOption) => void;
    onClearPrivateAlternatives: (category: string) => void;
    /** Keeps menus clear of the sticky mobile export bar. */
    menuCollisionPadding: { bottom: number };
};

export default function CategoryPickers({
    item,
    mainstreamApps,
    privateAlternatives,
    openKey,
    onOpenChange,
    onCloseAutoFocus,
    getTriggerHandlers,
    onSelectMainstreamApp,
    onTogglePrivateAlternative,
    onClearPrivateAlternatives,
    menuCollisionPadding,
}: CategoryPickersProps) {
    const mainTriggerRef = useRef<HTMLButtonElement>(null);
    const altTriggerRef = useRef<HTMLButtonElement>(null);
    // A menu still animating closed treats a tap on its own trigger as an
    // outside tap and would close the menu that tap just reopened. The
    // trigger toggles its menu itself, so ignore those.
    const ignoreOwnTrigger = (
        event: Event,
        trigger: React.RefObject<HTMLButtonElement | null>,
    ) => {
        if (trigger.current?.contains(event.target as Node)) {
            event.preventDefault();
        }
    };
    const selected = item.private_alternatives;
    const picked = selected.length > 0;
    const mainKey = `${item.category}-main`;
    const altKey = `${item.category}-alt`;
    // Includes the visible "Pick" label, so speech users can say "Pick".
    const selectedNames = picked
        ? selected.map((alternative) => alternative.name).join(", ")
        : "Pick";
    const mainApp = {
        id: item.mainstream_app_id,
        name: item.mainstream_app_name,
    };

    return (
        <article
            data-category={item.category}
            data-picked={picked || undefined}
            className="border-line-soft bg-layer hover:border-line data-picked:border-brand-200 flex min-w-0 flex-col gap-3.5 rounded-[18px] border px-[18px] pt-4 pb-[18px] transition-colors data-picked:bg-[linear-gradient(180deg,rgb(0_204_170/6%),transparent_60%)]"
        >
            <header className="flex items-center justify-between gap-2">
                <h3 className="font-heading min-w-0 text-[0.9375rem] font-semibold break-words">
                    {item.category}
                </h3>
                <span
                    aria-hidden="true"
                    className={cn(
                        "shrink-0 rounded-full border px-[9px] py-[3px] text-xs leading-[1.4] font-medium",
                        picked
                            ? "border-brand/30 bg-brand/12 text-brand"
                            : "border-line-soft text-caption",
                    )}
                >
                    {selected.length}/{MAX_PRIVATE_ALTERNATIVES}
                </span>
            </header>

            {/* Stacked, with the arrow pointing down, where a larger default
                font leaves no room for the pickers side by side. */}
            <div className="picker-row:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid grid-cols-1 items-stretch gap-2">
                <DropdownMenu
                    modal={false}
                    open={openKey === mainKey}
                    onOpenChange={(open) => onOpenChange(mainKey, open)}
                >
                    <DropdownMenuTrigger asChild>
                        <button
                            ref={mainTriggerRef}
                            type="button"
                            aria-label={`${item.category} app you used before: ${item.mainstream_app_name}`}
                            {...getTriggerHandlers(mainKey)}
                            className={triggerClassName}
                        >
                            <span className={logoFrameClassName}>
                                <AppLogo
                                    app={mainApp}
                                    size={64}
                                    priority={item.order <= 3}
                                />
                            </span>
                            <PickerName name={item.mainstream_app_name} />
                            <ChevronDownIcon className="text-caption mt-auto size-4" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        onCloseAutoFocus={(event) =>
                            onCloseAutoFocus(event, mainKey)
                        }
                        onPointerDownOutside={(event) =>
                            ignoreOwnTrigger(event, mainTriggerRef)
                        }
                        align="start"
                        side="bottom"
                        collisionPadding={menuCollisionPadding}
                        className={menuClassName}
                    >
                        <DropdownMenuLabel className={menuLabelClassName}>
                            <span className="min-w-0 break-words">
                                App you used before
                            </span>
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                            value={item.mainstream_app_id}
                            onValueChange={(id) => {
                                const app = mainstreamApps.find(
                                    (option) => option.id === id,
                                );
                                if (app) {
                                    onSelectMainstreamApp(item.category, app);
                                }
                            }}
                            className="p-1.5"
                        >
                            {mainstreamApps.map((app) => (
                                <DropdownMenuRadioItem
                                    key={app.id}
                                    value={app.id}
                                >
                                    <MenuAppName app={app} />
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <ArrowRightIcon
                    data-picker-arrow
                    className="picker-row:rotate-0 text-brand size-[22px] shrink-0 rotate-90 self-center justify-self-center"
                />

                <DropdownMenu
                    modal={false}
                    open={openKey === altKey}
                    onOpenChange={(open) => onOpenChange(altKey, open)}
                >
                    <DropdownMenuTrigger asChild>
                        <button
                            ref={altTriggerRef}
                            type="button"
                            aria-label={`${item.category} alternatives: ${selectedNames}; ${selected.length} of ${MAX_PRIVATE_ALTERNATIVES} selected`}
                            {...getTriggerHandlers(altKey)}
                            className={triggerClassName}
                        >
                            <span
                                className={cn(
                                    logoFrameClassName,
                                    !picked &&
                                        "border-line text-caption border-[1.5px] border-dashed",
                                    selected.length > 1 &&
                                        "grid-cols-2 gap-[3px] rounded-xl",
                                )}
                            >
                                {picked ? (
                                    selected.map((alternative) => (
                                        <span
                                            key={alternative.id}
                                            className={cn(
                                                "block overflow-hidden",
                                                selected.length > 1
                                                    ? "aspect-square w-full rounded-[7px]"
                                                    : "h-full w-full",
                                            )}
                                        >
                                            <AppLogo
                                                app={alternative}
                                                size={
                                                    selected.length > 1
                                                        ? 32
                                                        : 64
                                                }
                                            />
                                        </span>
                                    ))
                                ) : (
                                    <PlusIcon className="size-6" />
                                )}
                            </span>
                            <PickerName
                                name={getPrivateAlternativeLabel(selected)}
                                className={picked ? undefined : "text-caption"}
                            />
                            <ChevronDownIcon className="text-caption mt-auto size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        onCloseAutoFocus={(event) =>
                            onCloseAutoFocus(event, altKey)
                        }
                        onPointerDownOutside={(event) =>
                            ignoreOwnTrigger(event, altTriggerRef)
                        }
                        align="end"
                        side="bottom"
                        collisionPadding={menuCollisionPadding}
                        className={menuClassName}
                    >
                        <DropdownMenuLabel className={menuLabelClassName}>
                            <span className="min-w-0 break-words">
                                Alternatives
                            </span>
                            <span className="shrink-0">
                                {selected.length}/{MAX_PRIVATE_ALTERNATIVES}
                            </span>
                        </DropdownMenuLabel>
                        <div className="p-1.5">
                            {privateAlternatives.map((alternative) => {
                                const isSelected = selected.some(
                                    ({ id }) => id === alternative.id,
                                );

                                return (
                                    <DropdownMenuCheckboxItem
                                        key={alternative.id}
                                        checked={isSelected}
                                        disabled={
                                            !isSelected &&
                                            selected.length >=
                                                MAX_PRIVATE_ALTERNATIVES
                                        }
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            onTogglePrivateAlternative(
                                                item.category,
                                                alternative,
                                            );
                                        }}
                                    >
                                        <MenuAppName app={alternative} />
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                        </div>
                        {/* Set apart: at the cap, ArrowDown from the last
                            pick skips the disabled options straight to it. */}
                        <DropdownMenuSeparator className="bg-line-soft mx-0 my-0" />
                        <div className="bg-popover sticky bottom-0 p-1.5 [@media(max-height:30rem)]:static">
                            <DropdownMenuItem
                                aria-label={`Remove all ${item.category} alternatives`}
                                disabled={!picked}
                                onSelect={() =>
                                    onClearPrivateAlternatives(item.category)
                                }
                                className="text-caption focus:bg-layer-2 focus:text-heading cursor-pointer justify-center rounded-lg py-2 text-[0.8125rem] data-[disabled]:opacity-40"
                            >
                                Remove all
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </article>
    );
}

function MenuAppName({ app }: { app: AppOption }) {
    return (
        <>
            <span className="size-[26px] shrink-0 overflow-hidden rounded-[7px] text-xs">
                <AppLogo app={app} size={26} />
            </span>
            <span className="min-w-0 flex-1 break-words">{app.name}</span>
        </>
    );
}
