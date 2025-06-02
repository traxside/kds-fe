"use client";

import PerformanceTester from "@/components/PerformanceTester";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Performance Testing Suite
          </h1>
          <p className="text-gray-400">
            Test and benchmark the node culling performance optimizations for
            large bacterial populations.
          </p>
        </div>

        <PerformanceTester />
      </div>
    </div>
  );
}
