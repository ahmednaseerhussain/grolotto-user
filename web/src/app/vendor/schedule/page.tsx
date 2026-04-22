"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { vendorAPI } from "@/lib/api/vendor";
import { useTranslation } from "@/hooks/use-translation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Save, Trash2, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Schedule {
    id: string;
    vendorId: string;
    drawState: string;
    drawTime: string;
    openTime: string;
    closeTime: string;
    isActive: boolean;
}

const DRAW_STATES = ["NY", "FL", "GA", "TX", "PA", "CT", "TN", "NJ"];
const DRAW_TIMES = [
    { value: "morning", label: "Morning" },
    { value: "midday", label: "Midday" },
    { value: "evening", label: "Evening" },
];

export default function VendorSchedulePage() {
    const router = useRouter();
    const t = useTranslation();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);

    // New schedule form
    const [newState, setNewState] = useState("NY");
    const [newTime, setNewTime] = useState("morning");
    const [newOpen, setNewOpen] = useState("08:00");
    const [newClose, setNewClose] = useState("14:00");

    const load = async () => {
        try {
            setLoading(true);
            const data = await vendorAPI.getDrawSchedules();
            setSchedules(data);
        } catch {
            toast.error("Failed to load schedules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleSave = async () => {
        if (!/^\d{2}:\d{2}$/.test(newOpen) || !/^\d{2}:\d{2}$/.test(newClose)) {
            toast.error("Please enter valid times (HH:MM)");
            return;
        }
        setSaving(true);
        try {
            await vendorAPI.upsertDrawSchedule({
                drawState: newState,
                drawTime: newTime,
                openTime: newOpen,
                closeTime: newClose,
            });
            toast.success("Schedule saved");
            await load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save schedule");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this schedule?")) return;
        try {
            await vendorAPI.deleteDrawSchedule(id);
            toast.success("Schedule deleted");
            setSchedules((s) => s.filter((x) => x.id !== id));
        } catch {
            toast.error("Failed to delete schedule");
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold">{t("Draw Schedule") || "Draw Schedule"}</h1>
            </div>

            <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                    <p className="text-sm text-blue-800">
                        {t("Draw Schedule Help") ||
                            "Set opening and closing times for each state/draw. Players can only place bets when the draw is open. Times are in Haiti time (UTC-5)."}
                    </p>
                </CardContent>
            </Card>

            {/* Add new schedule */}
            <Card>
                <CardContent className="p-5 space-y-4">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4" /> {t("Add / Update Schedule") || "Add / Update Schedule"}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs text-gray-600">{t("State") || "State"}</label>
                            <select
                                value={newState}
                                onChange={(e) => setNewState(e.target.value)}
                                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            >
                                {DRAW_STATES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">{t("Draw Time") || "Draw Time"}</label>
                            <select
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            >
                                {DRAW_TIMES.map((dt) => (
                                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">{t("Open Time") || "Open Time"}</label>
                            <Input type="time" value={newOpen} onChange={(e) => setNewOpen(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">{t("Close Time") || "Close Time"}</label>
                            <Input type="time" value={newClose} onChange={(e) => setNewClose(e.target.value)} className="mt-1" />
                        </div>
                    </div>
                    <Button onClick={handleSave} loading={saving} className="w-full md:w-auto">
                        <Save className="h-4 w-4 mr-2" /> {t("Save Schedule") || "Save Schedule"}
                    </Button>
                </CardContent>
            </Card>

            {/* Existing schedules */}
            <div>
                <h2 className="font-semibold mb-3">{t("Current Schedules") || "Current Schedules"}</h2>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : schedules.length === 0 ? (
                    <Card className="bg-gray-50">
                        <CardContent className="p-6 text-center text-gray-500">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">{t("No Schedules") || "No schedules set. Draws are open by default."}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {schedules.map((s) => (
                            <Card key={s.id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-100 p-2 rounded-lg">
                                            <Clock className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm">{s.drawState}</p>
                                                <Badge variant="outline" className="capitalize text-xs">{s.drawTime}</Badge>
                                                {s.isActive ? (
                                                    <Badge variant="success" className="text-xs">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {s.openTime} - {s.closeTime}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
