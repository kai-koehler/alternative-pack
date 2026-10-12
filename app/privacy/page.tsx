import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Privacy Policy" };

const Privacy = () => {
    return (
        <div className="mx-auto w-[min(56rem,calc(100%-2.5rem))] pt-10 pb-16 max-sm:w-[calc(100%-2rem)] max-sm:pt-6">
            <div className="text-body flex flex-col gap-5 leading-relaxed">
                <h1 className="font-heading text-heading mt-[clamp(1.5rem,6vh,4rem)] mb-4 text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-semibold">
                    Privacy Policy
                </h1>
                <p>Last Updated: April 25, 2026</p>
                <p>
                    We respect the privacy of our Users (&quot;User&quot;,
                    &quot;your&quot;, &quot;you&quot;). This Privacy Policy
                    (&quot;Policy&quot;) explains how we handle information when
                    you use our website, <strong>privacypack.org</strong> (the
                    &quot;Site&quot;).
                </p>
                <p>
                    By accessing or using the Site, you agree to the terms of
                    this Policy. If you do not agree with the terms of this
                    Policy, please do not access or use the Site.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    1. Introduction
                </h2>
                <p>
                    <strong>privacypack.org</strong> allows users to create and
                    share cards showing the mainstream apps they previously used
                    and the privacy-respecting alternatives they have switched
                    to. The card is generated in your browser.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    2. Data Collection and Usage
                </h2>
                <p>
                    The Site does not require an account, does not ask you to
                    enter personal information, and does not upload the app
                    choices you make while building a card. They are kept only
                    in your browser&apos;s local storage, so your card is still
                    there when you come back. Clearing the Site&apos;s data in
                    your browser removes them.
                </p>
                <p>
                    Like most websites, the hosting provider may process basic
                    request information needed to serve the Site, such as IP
                    address, browser information, and request timestamps.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    3. Data Sharing
                </h2>
                <p>
                    We do not publish, host, or index your cards. If you
                    download or share a card, that happens through your browser,
                    device, or the third-party app or service you choose.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    4. User Rights
                </h2>
                <p>
                    Users have the right to stop using the Site at any time. If
                    you download or share a card elsewhere, you control that
                    copy through the place where you saved or shared it.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    5. Data Retention
                </h2>
                <p>
                    The Site does not retain your generated cards or app
                    selections.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    6. Children&apos;s Privacy
                </h2>
                <p>
                    The Site is not intended for children under the age of 13,
                    and we do not knowingly collect personal data from children
                    under 13. If you are under 13, please do not use the Site.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    7. Cookies
                </h2>
                <p>
                    We do not place cookies on your device for tracking
                    purposes.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    8. Changes to this Privacy Policy
                </h2>
                <p>
                    We may update this Privacy Policy to reflect changes in our
                    practices or for other operational, legal, or regulatory
                    reasons. Updates will be posted on this page.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    9. Contact Us
                </h2>
                <p>
                    You can reach us by email at:{" "}
                    <a
                        href="mailto:privacy@ente.io"
                        className="text-heading hover:text-brand underline underline-offset-[3px]"
                    >
                        privacy@ente.io
                    </a>
                </p>
                <p>
                    Mailing address: EnteIO Technologies Private Limited, 72/12,
                    Whitefield, Bengaluru, India.
                </p>

                <Link
                    href="/"
                    className="text-caption hover:text-brand mt-8 inline-flex items-center gap-1.5 text-sm font-medium"
                >
                    <ArrowLeftIcon className="size-[18px]" />
                    Home
                </Link>
            </div>
        </div>
    );
};

export default Privacy;
