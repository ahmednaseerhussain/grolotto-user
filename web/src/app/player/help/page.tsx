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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-800 font-medium text-sm pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
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
      title: t("faqHowToPlay") || "🎮 How to Play",
      icon: Gamepad2,
      color: "text-blue-400",
      items: [
        { question: t("faqPlayQ1") || "How do I play GroLotto?", answer: t("faqPlayA1") || "" },
        { question: t("faqPlayQ2") || "What are the different game types?", answer: t("faqPlayA2") || "" },
        { question: t("faqPlayQ3") || "What are the draw times?", answer: t("faqPlayA3") || "" },
        { question: t("faqPlayQ4") || "How do I know if I won?", answer: t("faqPlayA4") || "" },
      ],
    },
    {
      title: t("faqPaymentsWallet") || "💳 Payments & Wallet",
      icon: CreditCard,
      color: "text-green-400",
      items: [
        { question: t("faqPayQ1") || "How do I add money to my wallet?", answer: t("faqPayA1") || "" },
        { question: t("faqPayQ2") || "What payment methods are available?", answer: t("faqPayA2") || "" },
        { question: t("faqPayQ3") || "How do I withdraw my winnings?", answer: t("faqPayA3") || "" },
        { question: t("faqPayQ4") || "Are there withdrawal limits?", answer: t("faqPayA4") || "" },
      ],
    },
    {
      title: t("faqGiftCards") || "🎁 Gift Cards",
      icon: Gift,
      color: "text-amber-400",
      items: [
        { question: t("faqGiftQ1") || "How do gift cards work?", answer: t("faqGiftA1") || "" },
        { question: t("faqGiftQ2") || "How do I buy a gift card?", answer: t("faqGiftA2") || "" },
        { question: t("faqGiftQ3") || "How do I redeem a PIN?", answer: t("faqGiftA3") || "" },
      ],
    },
    {
      title: t("faqAccountSecurity") || "🛡️ Account & Security",
      icon: Shield,
      color: "text-violet-400",
      items: [
        { question: t("faqAccountQ1") || "How do I change my password?", answer: t("faqAccountA1") || "" },
        { question: t("faqAccountQ2") || "Is my data secure?", answer: t("faqAccountA2") || "" },
        { question: t("faqAccountQ3") || "What if I forget my password?", answer: t("faqAccountA3") || "" },
      ],
    },
    {
      title: t("faqRewardsBonuses") || "🏆 Rewards & Bonuses",
      icon: Trophy,
      color: "text-yellow-400",
      items: [
        { question: t("faqRewardsQ1") || "How do rewards work?", answer: t("faqRewardsA1") || "" },
        { question: t("faqRewardsQ2") || "What is the referral bonus?", answer: t("faqRewardsA2") || "" },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">
            <HelpCircle className="h-5 w-5 inline mr-2 text-emerald-600" />
            {t("helpCenter") || "Help Center"}
          </h1>
        </div>

        <div className="text-center py-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
          <HelpCircle className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-1">{t("howCanWeHelp") || "How can we help you?"}</h2>
          <p className="text-gray-500 text-sm">{t("helpSubtitle") || "Find answers to common questions below"}</p>
        </div>
      </div>

      {/* FAQ Sections */}
      {sections.map((section, si) => (
        <div key={si} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
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
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📞 {t("contactSupport") || "Contact Support"}</h3>
        <p className="text-gray-500 text-sm mb-4">{t("stillNeedHelp") || "Still need help? Reach out to our support team:"}</p>
        <div className="space-y-3">
          <a
            href="mailto:support@grolotto.com"
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-emerald-400 transition-colors"
          >
            <div className="bg-blue-100 p-2 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-800 font-medium text-sm">Email</p>
              <p className="text-gray-500 text-xs">support@grolotto.com</p>
            </div>
          </a>
          <a
            href="tel:+50937000000"
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-emerald-400 transition-colors"
          >
            <div className="bg-green-100 p-2 rounded-lg">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-gray-800 font-medium text-sm">Phone</p>
              <p className="text-gray-500 text-xs">+509 37 00 0000</p>
            </div>
          </a>
          <a
            href="https://wa.me/50937000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-emerald-400 transition-colors"
          >
            <div className="bg-emerald-100 p-2 rounded-lg">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-800 font-medium text-sm">WhatsApp</p>
              <p className="text-gray-500 text-xs">Chat with us</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
