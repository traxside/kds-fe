import { useState, useEffect, useMemo } from 'react';
import { useSimulationContext } from '@/context/SimulationContext';
import { Bacterium } from '@/types/simulation';

// Generate sample bacteria function
const generateSampleBacteria = (): Bacterium[] => {
    const sampleBacteria: Bacterium[] = [];
    const centerX = 300;
    const centerY = 300;
    const maxRadius = 250;

    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * maxRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const isResistant = Math.random() < 0.2;

        const bacterium: Bacterium = {
            id: `bacteria-${i}`,
            x,
            y,
            isResistant,
            fitness: 0.5 + Math.random() * 0.5,
            age: Math.floor(Math.random() * 10),
            generation: Math.floor(Math.random() * 5),
            parentId:
                i > 10 ? `bacteria-${Math.floor(Math.random() * 10)}` : undefined,
            color: isResistant ? "#ef4444" : "#22c55e",
            size: 3 + Math.random() * 3,
        };

        sampleBacteria.push(bacterium);
    }

    return sampleBacteria;
};

export function useBacteriaDisplay() {
    const { simulation, bacteria } = useSimulationContext();
    const [sampleBacteria, setSampleBacteria] = useState<Bacterium[]>([]);

    // Initialize sample data on mount
    useEffect(() => {
        setSampleBacteria(generateSampleBacteria());
    }, []);

    // Memoized display bacteria
    const displayBacteria = useMemo(() => {
        return bacteria.length > 0 ? bacteria : sampleBacteria;
    }, [bacteria, sampleBacteria]);

    // Calculate current stats
    const currentStats = useMemo(() => {
        if (simulation?.statistics && simulation.statistics.totalPopulation.length > 0) {
            const latestIndex = simulation.statistics.totalPopulation.length - 1;
            const totalCount = simulation.statistics.totalPopulation[latestIndex];
            const resistantCount = simulation.statistics.resistantCount[latestIndex];

            return {
                totalPopulation: totalCount,
                resistantCount: resistantCount,
                sensitiveCount: totalCount - resistantCount,
                resistancePercentage: totalCount > 0 ? (resistantCount / totalCount) * 100 : 0,
                isLiveData: true
            };
        } else if (displayBacteria.length > 0) {
            const totalCount = displayBacteria.length;
            const resistantCount = displayBacteria.filter(b => b.isResistant).length;

            return {
                totalPopulation: totalCount,
                resistantCount: resistantCount,
                sensitiveCount: totalCount - resistantCount,
                resistancePercentage: totalCount > 0 ? (resistantCount / totalCount) * 100 : 0,
                isLiveData: false
            };
        }

        // Default fallback
        return {
            totalPopulation: 0,
            resistantCount: 0,
            sensitiveCount: 0,
            resistancePercentage: 0,
            isLiveData: false
        };
    }, [simulation, displayBacteria]);

    const regenerateSampleData = () => {
        setSampleBacteria(generateSampleBacteria());
    };

    const isSampleData = bacteria.length === 0;

    return {
        displayBacteria,
        currentStats,
        isSampleData,
        regenerateSampleData
    };
}
