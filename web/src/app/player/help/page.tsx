"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ChevronDown, ChevronUp, HelpCircle, Gamepad2, CreditCard,
  Gift, Shield, Trophy, Mail, Phone, MessageCircle
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: React.ElementType;
  color: string;
  items: FAQItem[];
}

function Accordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-white font-medium text-sm pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-amber-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed border-t border-slate-700/50 pt-3">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const router = useRouter();
  const t = useTranslation();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sections: FAQSection[] = [
    {
      title: "🎮 How to Play",
      icon: Gamepad2,
      color: "text-blue-400",
      items: [
        {
          question: "How do I play GroLotto?",
          answer: "Go to the Play tab and choose a game type: Borlèt (pick 2 digits 00-99), Maryaj (pick 2 pairs of numbers), or Lotto 3/Lotto 4/Lotto 5 (pick 3, 4, or 5 numbers). Select your numbers, choose a draw time (Morning, Afternoon, or Evening), enter your bet amount, and tap Play!",
        },
        {
          question: "What are the different game types?",
          answer: "Borlèt: Pick a 2-digit number (00-99). Maryaj: Pick 2 pairs of numbers. Lotto 3: Pick 3 numbers. Lotto 4: Pick 4 numbers. Lotto 5: Pick 5 numbers. Tchala: Dream-number interpretations — search a dream symbol and play its associated number.",
        },
        {
          question: "What are the draw times?",
          answer: "There are three daily draws: Morning (Maten) at 10:00 AM, Afternoon (Aprèmidi) at 2:00 PM, and Evening (Aswè) at 8:00 PM. All times are Eastern Time (Haiti).",
        },
        {
          question: "How do I know if I won?",
          answer: "After each draw, check the Results tab to see winning numbers. You'll also receive a notification if you win. Winnings are automatically credited to your wallet.",
        },
        {
          question: "What is the minimum and maximum bet?",
          answer: "The minimum bet is 10 HTG (or $1 USD). Maximum bet varies by game type and is displayed on the play screen.",
        },
      ],
    },
    {
      title: "💳 Payments & Wallet",
      icon: CreditCard,
      color: "text-green-400",
      items: [
        {
          question: "How do I add money to my wallet?",
          answer: "Go to Payment, select a deposit amount (or enter a custom amount), choose your payment method (MonCash or PayPal), and complete the payment. Funds will appear in your wallet within minutes.",
        },
        {
          question: "What payment methods are available?",
          answer: "We currently support MonCash (Digicel mobile money) and PayPal. You can also fund your wallet with a Gift Card code.",
        },
        {
          question: "How do I withdraw my winnings?",
          answer: "Go to Payment, switch to the Withdraw tab, enter the amount you'd like to withdraw, and choose your withdrawal method. Processing typically takes 24-48 hours.",
        },
        {
          question: "Can I switch between HTG and USD?",
          answer: "Yes! Go to Settings and change your preferred currency. Your wallet shows balances in both HTG and USD. Bets and deposits are processed in your selected currency.",
        },
        {
          question: "Is there a fee for deposits or withdrawals?",
          answer: "GroLotto does not charge deposit fees. MonCash may apply their standard transaction fees. Withdrawal fees, if any, are shown before you confirm.",
        },
      ],
    },
    {
      title: "🎁 Gift Cards",
      icon: Gift,
      color: "text-amber-400",
      items: [
        {
          question: "How do gift cards work?",
          answer: "You can buy a gift card from your wallet balance and get a unique 12-character code (format: XXXX-XXXX-XXXX). Share this code with a friend, and they can redeem it to add funds to their wallet.",
        },
        {
          question: "What gift card amounts are available?",
          answer: "In HTG: 500, 1,000, 2,000, 5,000, and 10,000. In USD: $5, $10, $25, $50, and $100.",
        },
        {
          question: "Can I redeem my own gift card?",
          answer: "No, gift cards are meant to be shared. You cannot redeem a gift card that you purchased yourself.",
        },
        {
          question: "Do gift cards expire?",
          answer: "Yes, gift cards are valid for 1 year from the date of purchase.",
        },
        {
          question: "How do I redeem a gift card?",
          answer: "Go to Payment → Gift Cards → Redeem tab. Enter the 12-character code and tap Redeem. The amount will be instantly added to your wallet.",
        },
      ],
    },
    {
      title: "🛡️ Account & Security",
      icon: Shield,
      color: "text-violet-400",
      items: [
        {
          question: "How do I change my password?",
          answer: "Go to Settings → Security. You can update your password there. For your safety, you'll need to enter your current password first.",
        },
        {
          question: "How do I update my profile?",
          answer: "Go to Profile from the bottom navigation or sidebar. You can update your name and profile picture. Note: Phone number and email cannot be changed for security reasons.",
        },
        {
          question: "Is my data secure?",
          answer: "Yes. We use industry-standard encryption for all data in transit and at rest. Your password is hashed and never stored in plain text. We never share your personal information with third parties.",
        },
        {
          question: "What do I do if I forget my password?",
          answer: "On the login screen, tap 'Forgot Password' and enter your registered phone number or email. You'll receive a reset link to create a new password.",
        },
      ],
    },
    {
      title: "🏆 Rewards & Bonuses",
      icon: Trophy,
      color: "text-yellow-400",
      items: [
        {
          question: "How do rewards work?",
          answer: "You earn reward points every time you play. These points accumulate and can unlock special bonuses. Check the Rewards tab to see your current points and available rewards.",
        },
        {
          question: "What is the referral bonus?",
          answer: "Invite friends to GroLotto using your referral code. When they sign up and make their first deposit, both you and your friend receive a bonus credited to your wallets.",
        },
        {
          question: "Do reward points expire?",
          answer: "Reward points remain in your account as long as you play at least once every 90 days. Inactive accounts may have their points reset.",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-200 hover:text-white hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-100">
            <HelpCircle className="h-5 w-5 inline mr-2 text-amber-400" />
            {t("helpCenter") || "Help Center"}
          </h1>
        </div>

        <div className="text-center py-6 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/20">
          <HelpCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">{t("howCanWeHelp") || "How can we help you?"}</h2>
          <p className="text-slate-400 text-sm">Find answers to common questions below</p>
        </div>
      </div>

      {/* FAQ Sections */}
      {sections.map((section, si) => (
        <div key={si} className="bg-slate-900 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.items.map((item, qi) => {
              const key = `${si}-${qi}`;
              return (
                <Accordion
                  key={key}
                  item={item}
                  isOpen={openItems.has(key)}
                  onToggle={() => toggleItem(key)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Contact Section */}
      <div className="bg-slate-900 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">📞 {t("contactSupport") || "Contact Support"}</h3>
        <p className="text-slate-400 text-sm mb-4">Still need help? Reach out to our support team:</p>
        <div className="space-y-3">
          <a
            href="mailto:support@grolotto.com"
            className="flex items-center gap-3 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-amber-500/50 transition-colors"
          >
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Mail className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Email</p>
              <p className="text-slate-400 text-xs">support@grolotto.com</p>
            </div>
          </a>
          <a
            href="tel:+50937000000"
            className="flex items-center gap-3 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-amber-500/50 transition-colors"
          >
            <div className="bg-green-500/20 p-2 rounded-lg">
              <Phone className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Phone</p>
              <p className="text-slate-400 text-xs">+509 37 00 0000</p>
            </div>
          </a>
          <a
            href="https://wa.me/50937000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-amber-500/50 transition-colors"
          >
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">WhatsApp</p>
              <p className="text-slate-400 text-xs">Chat with us</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
