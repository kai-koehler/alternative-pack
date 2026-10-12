import localFont from "next/font/local";

// Self-hosted (the CSP in public/_headers allows fonts from 'self' only).
// Latin subsets of Poppins and Roboto from Fontsource, under the SIL Open
// Font License (see the licence files next to them).
export const poppins = localFont({
    src: "./fonts/Poppins-SemiBold.woff2",
    weight: "600",
    variable: "--font-poppins",
    fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

export const roboto = localFont({
    src: [
        { path: "./fonts/Roboto-Regular.woff2", weight: "400" },
        { path: "./fonts/Roboto-Medium.woff2", weight: "500" },
        { path: "./fonts/Roboto-Bold.woff2", weight: "700" },
    ],
    variable: "--font-roboto",
    fallback: [
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "Arial",
        "sans-serif",
    ],
});
