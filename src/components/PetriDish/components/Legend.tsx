import React from "react";

export function Legend() {
  return (
    <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs">
      <div className="font-semibold mb-2">Legend</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Sensitive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600"></div>
          <span>Resistant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-gray-500"></div>
          <span>Parent → Child</span>
        </div>
        <div className="text-gray-500 mt-2">
          <strong>Interactions:</strong>
          <br />
          • Drag nodes to move
          <br />
          • Zoom to see details
          <br />
          • Connected nodes pull together
          <br />
          Lines = Inheritance
        </div>
      </div>
    </div>
  );
} 