import React from "react";

// Line icons from tools.kai-koehler.com, drawn on a 24px grid. The swap
// arrows are Hugeicons' "arrow-data-transfer-horizontal" (stroke rounded).

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {children}
        </svg>
    );
}

export const ArrowRightIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M20 12H4M15 7l5 5-5 5" />
    </Icon>
);

export const ArrowLeftIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M4 12h16M9 7l-5 5 5 5" />
    </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M6 9l6 6 6-6" />
    </Icon>
);

export const ShareIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M12 15V3M8 7l4-4 4 4" />
        <path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
    </Icon>
);

export const DownloadIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M4 17v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
    </Icon>
);

export const SearchIcon = (props: IconProps) => (
    <Icon {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
    </Icon>
);

export const ResetIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7" />
        <path d="M4 4v4.7h4.7" />
    </Icon>
);

export const CheckIcon = (props: IconProps) => (
    <Icon strokeWidth={2.2} {...props}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
);

export const PlusIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M12 5v14M5 12h14" />
    </Icon>
);

export const SWAP_ICON_PATH =
    "M19 9H6.659c-1.006 0-1.51 0-1.634-.309c-.125-.308.23-.672.941-1.398L8.211 5M5 15h12.341c1.006 0 1.51 0 1.634.309c.125.308-.23.672-.941 1.398L15.789 19";

/** The Alternative Pack mark: swap arrows on a rounded brand tile. */
export const BrandMark = (props: IconProps) => (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
        <rect width="32" height="32" rx="9" fill="#00ccaa" />
        <path
            transform="translate(4 4)"
            d={SWAP_ICON_PATH}
            fill="none"
            stroke="#111317"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
