"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Sparkles, Shield, Globe, Users, Trophy, Clock,
  CheckCircle, Heart, Target, Zap
} from "lucide-react";

export default function AboutPage() {
  const router = useRouter();
  const t = useTranslation();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 bg-white/95 backdrop-blur-sm py-4 z-10 border-b">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-amber-500">GROLOTTO</h1>
          <p className="text-sm text-gray-500">About Us</p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mb-4">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">About GroLotto</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          The Digital Lottery Experience — Bringing tradition into the modern age
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <p className="text-gray-700 leading-relaxed">
            GroLotto is a modern digital platform designed to bring the traditional Haitian lottery experience into the digital age. For generations in Haiti, playing the lottery has required people to physically visit a local lottery location known as a "Bank." While this tradition remains an important part of the culture, it also creates limitations. Weather conditions, transportation challenges, security concerns, or even a busy schedule can prevent players from reaching a lottery bank in time to place their numbers.
          </p>

          <p className="text-gray-700 leading-relaxed">
            GroLotto was created to solve this problem while respecting and preserving the traditional lottery system. Instead of replacing the existing structure, GroLotto enhances it by creating a secure digital bridge between players and traditional lottery banks. Through the platform, players can access the same lottery games they already know and trust, but now from anywhere in the world using their mobile device.
          </p>

          <p className="text-gray-700 leading-relaxed">
            With GroLotto, users can select their preferred lottery bank, choose the state draw they want to play, select the draw time (Morning, Midday, or Evening), and place their bets in seconds. The platform supports popular lottery game types such as Senp, Maryaj, Lotto 3, Lotto 4, and Lotto 5, allowing players to enjoy the same authentic experience they would have at a physical bank.
          </p>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Globe className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Global Access</h3>
                <p className="text-sm text-gray-600">
                  Available in multiple languages (Haitian Creole, English, French, Spanish) and supports HTG & USD currencies for players worldwide.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tchala Dream Numbers</h3>
                <p className="text-sm text-gray-600">
                  A digital dream interpretation tool deeply rooted in Haitian lottery culture. Search dream meanings and discover lucky numbers privately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Privacy & Security</h3>
                <p className="text-sm text-gray-600">
                  Play privately without sharing your numbers or strategies. All transactions are secure and recorded for transparency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Convenient Access</h3>
                <p className="text-sm text-gray-600">
                  Play anytime from anywhere — Morning, Midday, or Evening draws. No travel required, no missed opportunities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-6 w-6 text-amber-600" />
            How GroLotto Works
          </h2>
          
          <div className="space-y-4">
            {[
              { step: "1", title: "Choose a Lottery Bank", desc: "Browse and select a trusted lottery bank registered on the platform." },
              { step: "2", title: "Select Your State & Draw Time", desc: "Choose the lottery state and the draw time you want to play — Morning, Midday, or Evening." },
              { step: "3", title: "Choose Your Game Type", desc: "Select from popular lottery games such as Senp, Maryaj, Lotto 3, Lotto 4, or Lotto 5." },
              { step: "4", title: "Pick Your Numbers", desc: "Enter your numbers and choose the amount you want to play." },
              { step: "5", title: "Confirm & Play", desc: "Confirm your ticket and place your bet instantly. Your numbers are now registered for the selected draw." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Features */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-600" />
            Platform Features
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Trophy, title: "Digital Lottery Access", desc: "Play traditional Haitian lottery games online from anywhere in the world." },
              { icon: Sparkles, title: "Multiple Game Types", desc: "Enjoy classic games including Senp, Maryaj, Lotto 3, Lotto 4, and Lotto 5." },
              { icon: Clock, title: "Morning, Midday & Evening Draws", desc: "Never miss a draw again with convenient digital access." },
              { icon: Sparkles, title: "Tchala — Dream Numbers", desc: "Search dream meanings and instantly discover lucky numbers associated with your dreams." },
              { icon: Globe, title: "Multiple Languages", desc: "GroLotto supports Haitian Creole, English, French, and Spanish." },
              { icon: Shield, title: "Multiple Currencies", desc: "Play using Haitian Gourdes (HTG) or U.S. Dollars (USD)." },
              { icon: CheckCircle, title: "Secure Wallet System", desc: "Deposit funds, place bets, and receive winnings easily through your account wallet." },
              { icon: Heart, title: "Private & Convenient", desc: "Play your numbers privately without needing to visit a lottery bank or ask someone else to play for you." },
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">{feature.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* For Vendors */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-green-600" />
            For Lottery Banks
          </h2>
          
          <p className="text-gray-700 mb-4">
            GroLotto provides traditional lottery operators with a powerful digital platform to expand their business. Lottery banks can register on the platform and make their services available to players online. This allows vendors to reach customers beyond their physical location and grow their audience both locally and internationally.
          </p>
          
          <p className="font-semibold text-gray-900 mb-2">Through the GroLotto vendor dashboard, lottery operators can:</p>
          <ul className="space-y-2 text-gray-700">
            {[
              "Manage available lottery draws",
              "Set betting limits for each game type",
              "Track daily sales and commissions",
              "Monitor player activity",
              "Publish results and announcements"
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-blue-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Security & Transparency
          </h2>
          
          <div className="space-y-4 text-gray-700">
            <p>
              GroLotto is built with security and transparency as top priorities. All transactions and player activity are recorded within the platform to ensure accountability and fairness. The system protects both players and vendors by maintaining a secure digital record of all bets placed on the platform.
            </p>
            
            <p>
              Players receive their full winnings without service fees charged by GroLotto. Only minimal transaction-related charges may apply depending on the payment method used.
            </p>
            
            <p className="font-semibold text-gray-900">
              Our mission is to provide a safe and reliable environment where players and lottery operators can interact with confidence.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Why GroLotto */}
      <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <CardContent className="p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Why Choose GroLotto?</h2>
          
          <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
            GroLotto removes the barriers that often prevent players from participating in the lottery. Bad weather, transportation issues, security concerns, or busy schedules should never stop someone from playing their favorite numbers.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="font-bold text-xl">Play when you want</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="font-bold text-xl">Play privately</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="font-bold text-xl">Play from anywhere</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-white/80">
              Innovation without losing tradition
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Version Footer */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t">
        <p>GroLotto Platform — Version 1.0.0</p>
        <p className="mt-1">© 2024-2026 GroLotto. Bringing tradition into the digital age.</p>
      </div>
    </div>
  );
}
