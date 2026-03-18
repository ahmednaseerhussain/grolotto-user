'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
            <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Something went wrong</h2>
                <p style={{ color: '#6b7280', marginBottom: 24 }}>An unexpected error occurred. Please try again.</p>
                <button
                    onClick={reset}
                    style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
