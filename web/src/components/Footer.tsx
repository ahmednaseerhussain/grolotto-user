"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";
import { paymentOrderAPI } from "@/lib/api/gift-cards";

interface PaymentConfig {
    zelle_email?: string;
    cashapp_tag?: string;
    social_facebook?: string;
    social_instagram?: string;
    social_tiktok?: string;
    support_phone?: string;
}

const FALLBACK = {
    zelle_email: "pay@grolotto.com",
    cashapp_tag: "$groloto",
    social_facebook: "Grolotto",
    social_instagram: "@Grolotto",
    social_tiktok: "@Grolotto",
};

// TikTok icon — lucide doesn't ship one, so we inline a minimal SVG.
function TikTokIcon({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.85a8.16 8.16 0 0 0 4.77 1.52V6.93a4.85 4.85 0 0 1-1.84-.24z" />
        </svg>
    );
}

function fbHref(handle: string) {
    if (!handle) return "https://www.facebook.com";
    if (handle.startsWith("http")) return handle;
    return `https://www.facebook.com/${handle.replace(/^@/, "")}`;
}
function igHref(handle: string) {
    if (!handle) return "https://www.instagram.com";
    if (handle.startsWith("http")) return handle;
    return `https://www.instagram.com/${handle.replace(/^@/, "")}`;
}
function ttHref(handle: string) {
    if (!handle) return "https://www.tiktok.com";
    if (handle.startsWith("http")) return handle;
    const tag = handle.startsWith("@") ? handle : `@${handle}`;
    return `https://www.tiktok.com/${tag}`;
}

export function Footer() {
    const [cfg, setCfg] = useState<PaymentConfig>({});

    useEffect(() => {
        let cancelled = false;
        paymentOrderAPI
            .getPaymentConfig()
            .then((c: Record<string, string>) => { if (!cancelled) setCfg(c || {}); })
            .catch(() => { /* keep fallbacks */ });
        return () => { cancelled = true; };
    }, []);

    const facebook = cfg.social_facebook || FALLBACK.social_facebook;
    const instagram = cfg.social_instagram || FALLBACK.social_instagram;
    const tiktok = cfg.social_tiktok || FALLBACK.social_tiktok;
    const zelle = cfg.zelle_email || FALLBACK.zelle_email;
    const cashapp = cfg.cashapp_tag || FALLBACK.cashapp_tag;

    return (
        <footer className="mt-12 border-t border-gray-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <img src="/grolotto-logo.png" alt="GroLotto" className="w-8 h-8 rounded-lg object-contain" />
                        <span className="font-bold text-gray-900">GroLotto</span>
                    </div>
                    <p className="text-gray-500">Haiti's premier lottery platform for players and vendors.</p>
                </div>

                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Follow us</h3>
                    <ul className="space-y-2 text-gray-600">
                        <li>
                            <a href={fbHref(facebook)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-amber-600">
                                <Facebook className="h-4 w-4" /> {facebook}
                            </a>
                        </li>
                        <li>
                            <a href={igHref(instagram)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-amber-600">
                                <Instagram className="h-4 w-4" /> {instagram}
                            </a>
                        </li>
                        <li>
                            <a href={ttHref(tiktok)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-amber-600">
                                <TikTokIcon /> {tiktok}
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Payments</h3>
                    <ul className="space-y-2 text-gray-600">
                        <li><span className="text-gray-500">Zelle:</span> <span className="font-mono text-gray-800">{zelle}</span></li>
                        <li><span className="text-gray-500">Cash App:</span> <span className="font-mono text-gray-800">{cashapp}</span></li>
                        <li className="pt-2">
                            <Link href="/terms" className="text-amber-600 hover:underline">Terms &amp; Conditions</Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-gray-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span>&copy; {new Date().getFullYear()} GroLotto. All rights reserved.</span>
                    <span>Play responsibly. 18+ only.</span>
                </div>
            </div>
        </footer>
    );
}
