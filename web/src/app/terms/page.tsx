import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Terms & Conditions — GroLotto",
    description: "Terms & Conditions for GroLotto players and vendors.",
};

const LAST_UPDATED = "January 2025";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                    <img src="/grolotto-logo.png" alt="GroLotto" className="w-9 h-9 rounded-lg object-contain" />
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <article className="bg-white shadow-sm rounded-2xl p-6 sm:p-10 prose prose-gray max-w-none">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms &amp; Conditions</h1>
                    <p className="text-sm text-gray-500 mb-8">Last updated: {LAST_UPDATED}</p>

                    <p>
                        Welcome to <strong>GroLotto</strong>. By creating an account or using our platform, you agree to the following
                        Terms &amp; Conditions. Please read them carefully. If you do not agree with any part of these terms, you must
                        not register or use the service.
                    </p>

                    <h2 className="mt-8">1. Eligibility</h2>
                    <ul>
                        <li>You must be at least <strong>18 years old</strong> to create an account or place any wager.</li>
                        <li>You must provide accurate information, including a valid email address and a Haitian phone number in the format <code>+509XXXXXXXX</code>.</li>
                        <li>You may hold only one account. Duplicate accounts may be suspended without notice.</li>
                        <li>GroLotto is intended for users physically located in jurisdictions where lottery participation is legal.</li>
                    </ul>

                    <h2 className="mt-8">2. Account Security</h2>
                    <ul>
                        <li>You are responsible for keeping your password and verification codes confidential.</li>
                        <li>Email verification is required to activate your account.</li>
                        <li>Notify support immediately if you suspect unauthorized access.</li>
                    </ul>

                    <hr className="my-10" />

                    <h2 id="players" className="text-2xl">For Players</h2>

                    <h3>3. Wagering &amp; Draws</h3>
                    <ul>
                        <li>All wagers are placed in either USD or HTG depending on the vendor you choose.</li>
                        <li>Once a wager is confirmed, it cannot be cancelled or refunded.</li>
                        <li>Winning numbers are published after each official draw. Payouts are calculated using the configured multipliers.</li>
                        <li>GroLotto is not responsible for any delay in draw results published by third-party state lotteries.</li>
                    </ul>

                    <h3>4. Wallets &amp; Payments</h3>
                    <ul>
                        <li>Deposits and withdrawals are processed via supported providers (MonCash, PayPal, Zelle, Cash App, gift cards, or vendor cash).</li>
                        <li>Withdrawals may require identity verification before being approved.</li>
                        <li>Wallet balances do not earn interest and may be subject to platform fees if applicable.</li>
                        <li>GroLotto is not liable for transaction delays caused by third-party payment providers.</li>
                    </ul>

                    <h3>5. Player Conduct</h3>
                    <ul>
                        <li>Fraud, chargebacks, or manipulation of the platform may result in account suspension and forfeiture of balances.</li>
                        <li>Use of automated tools, bots, or scripts is strictly prohibited.</li>
                    </ul>

                    <hr className="my-10" />

                    <h2 id="vendors" className="text-2xl">For Vendors</h2>

                    <h3>6. Vendor Application &amp; Approval</h3>
                    <ul>
                        <li>Vendor accounts are subject to admin review and approval. We may request additional documents (ID card, business license, address proof) before activating your account.</li>
                        <li>We reserve the right to refuse or revoke vendor status at our sole discretion.</li>
                        <li>Your business name, displayed publicly to players, must be accurate and not misleading.</li>
                    </ul>

                    <h3>7. Commission, Payouts &amp; Settlement</h3>
                    <ul>
                        <li>Vendors retain a configured commission percentage on player bets placed through their account.</li>
                        <li>Player winnings are funded from the vendor's settlement balance and the platform commission pool, according to the active configuration.</li>
                        <li>Settlement requests must be submitted through the dashboard and may be subject to a minimum amount and processing window.</li>
                        <li>Vendors are responsible for accurately recording cash-in, cash-out, and player-cash transactions.</li>
                    </ul>

                    <h3>8. Compliance &amp; Reporting</h3>
                    <ul>
                        <li>Vendors must comply with all local laws applicable to lottery sales and money handling in their jurisdiction.</li>
                        <li>You agree to provide transaction records to GroLotto or regulators upon request.</li>
                        <li>You must report suspected fraud, money laundering, or underage activity immediately.</li>
                    </ul>

                    <hr className="my-10" />

                    <h2 className="mt-8">9. Responsible Gaming</h2>
                    <p>
                        Lottery games carry the risk of financial loss. Only play with money you can afford to lose. If you feel that
                        gambling is affecting your wellbeing, contact a local support service.
                    </p>

                    <h2 className="mt-8">10. Privacy</h2>
                    <p>
                        We collect, store, and process your personal data (name, email, phone, transaction history) to operate the
                        service, comply with the law, and prevent fraud. We do not sell your personal data to third parties.
                    </p>

                    <h2 className="mt-8">11. Changes to These Terms</h2>
                    <p>
                        We may update these Terms &amp; Conditions from time to time. Continued use of the platform after changes are
                        posted constitutes acceptance of the new terms. Material changes may require you to re-accept the terms before
                        you can keep using the service.
                    </p>

                    <h2 className="mt-8">12. Contact</h2>
                    <p>
                        Questions about these Terms? Email{" "}
                        <a href="mailto:support@grolotto.com" className="text-amber-600 hover:underline">
                            support@grolotto.com
                        </a>
                        .
                    </p>
                </article>
            </main>

            <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-gray-500">
                &copy; {new Date().getFullYear()} GroLotto. All rights reserved.
            </footer>
        </div>
    );
}
