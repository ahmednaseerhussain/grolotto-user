"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useTranslation } from "@/hooks/use-translation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import {
  ArrowLeft, CreditCard, Smartphone, Plus, Trash2, Star, Info
} from "lucide-react";
import toast from "react-hot-toast";

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const user = useAppStore((s) => s.user);

  const [activeTab, setActiveTab] = useState("deposit");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const depositMethods = user?.paymentMethods || [];
  const payoutMethods = user?.payoutMethods || [];

  const handleAdd = () => {
    if (!selectedType) {
      toast.error("Please select a payment method type");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    if (phoneNumber.length < 8) {
      toast.error("Please enter a valid phone number");
      return;
    }
    // In the web version, we'd call an API or update store
    toast.success("Payment method added!");
    setShowAddModal(false);
    setSelectedType(null);
    setDisplayName("");
    setPhoneNumber("");
  };

  const handleRemove = (id: string) => {
    if (confirm("Are you sure you want to remove this method?")) {
      toast.success("Payment method removed");
    }
  };

  const renderMethodCard = (method: any, type: "deposit" | "payout") => (
    <Card key={method.id} className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="bg-red-500 p-2 rounded-lg">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{method.displayName || "MonCash"}</p>
            {method.isDefault && <Badge variant="success" className="text-xs">Default</Badge>}
          </div>
          <p className="text-xs text-gray-500">{method.phoneNumber}</p>
        </div>
        <div className="flex gap-2">
          {!method.isDefault && (
            <Button variant="ghost" size="sm" className="text-xs">
              Set Default
            </Button>
          )}
          <button onClick={() => handleRemove(method.id)} className="text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Payment Methods</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="deposit">💳 Deposit Methods</TabsTrigger>
          <TabsTrigger value="payout">💰 Payout Methods</TabsTrigger>
        </TabsList>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-100 mt-4">
          <CardContent className="p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              {activeTab === "deposit"
                ? "Deposit methods are used to add funds to your wallet."
                : "Payout methods are used to receive your winnings."}
            </p>
          </CardContent>
        </Card>

        <TabsContent value="deposit" className="mt-4 space-y-3">
          {depositMethods.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12 text-gray-300" />}
              title="No deposit methods"
              description="Add a payment method to start depositing funds"
            />
          ) : (
            depositMethods.map((m: any) => renderMethodCard(m, "deposit"))
          )}
        </TabsContent>

        <TabsContent value="payout" className="mt-4 space-y-3">
          {payoutMethods.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12 text-gray-300" />}
              title="No payout methods"
              description="Add a payout method to receive your winnings"
            />
          ) : (
            payoutMethods.map((m: any) => renderMethodCard(m, "payout"))
          )}
        </TabsContent>
      </Tabs>

      {/* Add Button */}
      <Button onClick={() => setShowAddModal(true)} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" /> Add {activeTab === "deposit" ? "Payment" : "Payout"} Method
      </Button>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {activeTab === "deposit" ? "Payment" : "Payout"} Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <button
              onClick={() => setSelectedType("moncash")}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                selectedType === "moncash" ? "border-red-500 bg-red-50" : "border-gray-200"
              }`}
            >
              <div className="bg-red-500 p-2 rounded-lg">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold">MonCash</p>
                <p className="text-xs text-gray-500">Digicel mobile money</p>
              </div>
            </button>

            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., My MonCash"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+509 XXXX XXXX"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Method</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
