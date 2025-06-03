import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LuChartBar, LuList } from "react-icons/lu";
import StatisticsPanel from "@/components/StatisticsPanel";
import VirtualizedBacteriaList from "@/components/VirtualizedBacteriaList";
import { useSimulationContext } from "@/context/SimulationContext";
import { useBacteriaDisplay } from "@/hooks/useBacteriaDisplay";
import { colors } from "@/lib/colors";

export default function ChartsAndDataSection() {
    const { simulation, isLoading } = useSimulationContext();
    const { displayBacteria } = useBacteriaDisplay();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Charts Card */}
            <Card
                className="border"
                style={{
                    backgroundColor: `${colors.surface.a10}cc`,
                    backdropFilter: "blur(12px)",
                    borderColor: colors.surface.a20,
                }}
            >
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                        <LuChartBar
                            className="h-5 w-5 mr-2"
                            style={{ color: colors.primary.a0 }}
                        />
                        <span style={{ color: colors.light }}>Charts</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <StatisticsPanel
                        statistics={simulation?.statistics}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            {/* Data Card */}
            <Card
                className="border"
                style={{
                    backgroundColor: `${colors.surface.a10}cc`,
                    backdropFilter: "blur(12px)",
                    borderColor: colors.surface.a20,
                }}
            >
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                        <LuList
                            className="h-5 w-5 mr-2"
                            style={{ color: colors.primary.a0 }}
                        />
                        <span style={{ color: colors.light }}>Data</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <VirtualizedBacteriaList
                        bacteria={displayBacteria}
                        height={350}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
