import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface BacteriaLegendProps {
  className?: string;
  style?: React.CSSProperties;
}

export const BacteriaLegend: React.FC<BacteriaLegendProps> = ({ 
  className = "",
  style = {} 
}) => {
  const legendItems = [
    {
      label: "Sensitive",
      color: "#22c55e",
      shape: "circle",
      description: "Susceptible to antibiotics"
    },
    {
      label: "Resistant", 
      color: "#ef4444",
      shape: "star",
      description: "Antibiotic resistant"
    }
  ];

  const StarIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );

  const CircleIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="7"/>
    </svg>
  );

  return (
    <Card 
      className={`absolute top-4 right-4 z-20 ${className}`}
      style={{
        backgroundColor: 'rgba(18, 18, 18, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        ...style
      }}
    >
      <CardContent className="p-3">
        <div className="text-xs font-medium text-white mb-2">
          Legend
        </div>
        <div className="space-y-1.5">
          {legendItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="flex items-center justify-center w-4 h-4 rounded-sm"
                style={{ 
                  backgroundColor: item.color,
                  color: 'white'
                }}
              >
                {item.shape === 'star' ? <StarIcon /> : <CircleIcon />}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-xs font-medium">
                  {item.label}
                </span>
                <span className="text-gray-300 text-xs opacity-75">
                  {item.description}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            Size = fitness level
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 