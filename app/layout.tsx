import type { Metadata, Viewport } from "next";
import { poppins, roboto } from "./fonts";
import { getAssetUrl } from "@/lib/assets";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    openGraph: {
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        siteName: SITE_NAME,
        images: [
            {
                url: `${SITE_URL}${getAssetUrl("/og-image.png")}`,
                width: 1200,
                height: 630,
                alt: `${SITE_NAME} preview`,
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        images: [`${SITE_URL}${getAssetUrl("/og-image.png")}`],
    },
};

export const viewport: Viewport = { themeColor: "#111317" };

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${poppins.variable} ${roboto.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
