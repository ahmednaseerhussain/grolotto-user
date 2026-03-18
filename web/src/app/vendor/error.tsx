'use client';

import { useRouter } from 'next/navigation';

export default function VendorError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Something went wrong</h2>
                <p style={{ color: '#6b7280', marginBottom: 24 }}>We couldn&apos;t load this page. Please try again.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                        onClick={reset}
                        style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => router.push('/vendor/dashboard')}
                        style={{ padding: '10px 24px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
