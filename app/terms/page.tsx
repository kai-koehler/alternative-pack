import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Terms and Conditions" };

const Terms = () => {
    return (
        <div className="mx-auto w-[min(56rem,calc(100%-2.5rem))] pt-10 pb-16 max-sm:w-[calc(100%-2rem)] max-sm:pt-6">
            <div className="text-body flex flex-col gap-5 leading-relaxed">
                <h1 className="font-heading text-heading mt-[clamp(1.5rem,6vh,4rem)] mb-4 text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-semibold">
                    Terms and Conditions
                </h1>
                <p>Last Updated: April 25, 2026</p>
                <p>
                    These Terms and Conditions (&quot;Agreement&quot; or
                    &quot;Terms&quot;) are a legally binding agreement between
                    EnteIO Technologies Private Limited (&quot;we&quot;,
                    &quot;our&quot;) and any person (&quot;User&quot;,
                    &quot;you&quot;, &quot;your&quot;) who accesses or uses our
                    website <strong>privacypack.org</strong> (the
                    &quot;Site&quot;). This Agreement, along with our{" "}
                    <Link
                        href="/privacy"
                        className="text-heading hover:text-brand underline underline-offset-[3px]"
                    >
                        Privacy Policy
                    </Link>{" "}
                    and any other policies referenced, governs your use of our
                    services.
                </p>
                <p>
                    By accessing or using the Site, you agree to be bound by
                    these Terms. If you do not agree with any part of this
                    Agreement, please do not use the Site.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    1. Description of Services
                </h2>
                <p>
                    <strong>privacypack.org</strong> allows users to create and
                    share cards showing the mainstream apps they previously used
                    and the privacy-respecting alternatives they have switched
                    to. Cards are generated in the user&apos;s browser and can
                    be downloaded or shared by the user. The Site is for
                    informational and educational purposes only.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    2. Use of Logos and Intellectual Property
                </h2>
                <p>
                    All app logos and trademarks are the property of their
                    respective owners. We do not claim any ownership of these
                    logos. Use of logos is solely for informational and
                    comparative purposes, and we respect the intellectual
                    property rights of all third parties.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    3. Privacy Policy
                </h2>
                <p>
                    Our{" "}
                    <Link
                        href="/privacy"
                        className="text-heading hover:text-brand underline underline-offset-[3px]"
                    >
                        Privacy Policy
                    </Link>{" "}
                    explains how we handle your information. By using the Site,
                    you agree to the practices described there.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    4. Eligibility
                </h2>
                <p>To use the Site, Users must:</p>
                <ul className="list-disc pl-8">
                    <li>Be 13 years of age or older.</li>
                    <li>
                        Not be prohibited from using the Site under applicable
                        laws.
                    </li>
                    <li>
                        Not use the Site for illegal, competitive, or malicious
                        purposes.
                    </li>
                </ul>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    5. User Responsibilities
                </h2>
                <p>
                    <strong>(a) No Malicious Use:</strong> You agree not to use
                    the Site to distribute malware, spam, or otherwise disrupt
                    the Site or its services.
                </p>
                <p>
                    <strong>(b) Your shared copies:</strong> If you download or
                    share a card outside the Site, you are responsible for where
                    and how you share that copy.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    6. Limitations of Liability
                </h2>
                <p>
                    To the fullest extent permitted by law, we are not liable
                    for any damages, losses, or claims arising from your use of
                    the Site or use of logos and app comparisons.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    7. Indemnification
                </h2>
                <p>
                    You agree to indemnify and hold us harmless from any claims,
                    damages, or legal costs arising from your use of the Site,
                    generated cards, shared copies, or violation of these Terms.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    8. Modifications to Terms
                </h2>
                <p>
                    We may update these Terms at any time. Changes are effective
                    upon posting. Continued use of the Site after updates
                    constitutes acceptance of the revised Terms.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    9. Governing Law
                </h2>
                <p>
                    These Terms are governed by the laws of India. Any dispute
                    not subject to arbitration shall be resolved in courts
                    located in Bangalore, Karnataka, India.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    10. Miscellaneous
                </h2>
                <p>
                    These Terms, together with the Privacy Policy, represent the
                    entire agreement between you and us regarding the Site.
                    Failure to enforce any provision does not waive our rights
                    under these Terms.
                </p>

                <h2 className="font-heading text-heading mt-3 text-lg font-semibold">
                    11. Contact Us
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

export default Terms;
