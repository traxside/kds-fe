"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  LuPlay,
  LuRefreshCw,
  LuTestTube,
  LuZap,
  LuChartBar,
} from "react-icons/lu";
import PetriDish from "./PetriDish";
import { Bacterium } from "@/types/simulation";
import {
  generateTestBacteria,
  PerformanceTestRunner,
  TEST_SCENARIOS,
  validateCullingAccuracy,
  validateSpatialDistribution,
  estimateMemoryUsage,
} from "@/lib/test-utils";
import {
  cullNodesForDisplay,
  cullNodesWithSpatialDistribution,
  cullNodesWithDensityAwareness,
  CachedNodeCuller,
  PerformanceMonitor,
} from "@/lib/performance";

interface TestResult {
  scenario: string;
  populationSize: number;
  cullingTime: number;
  renderTime: number;
  memoryEstimate: number;
  accuracyValidation: ReturnType<typeof validateCullingAccuracy>;
  spatialValidation: ReturnType<typeof validateSpatialDistribution>;
}

export default function PerformanceTester() {
  const [testBacteria, setTestBacteria] = useState<Bacterium[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [populationSize, setPopulationSize] = useState([5000]);
  const [maxDisplayNodes, setMaxDisplayNodes] = useState([1000]);
  const [resistanceRatio, setResistanceRatio] = useState([30]);
  const [clustered, setClustered] = useState(false);
  const [enableSpatialSampling, setEnableSpatialSampling] = useState(true);
  const [testMode, setTestMode] = useState<"basic" | "spatial" | "density">(
    "spatial"
  );

  const performanceMonitor = useRef(new PerformanceMonitor());
  const nodeCuller = useRef(new CachedNodeCuller());
  const testRunner = useRef(new PerformanceTestRunner());

  // Generate test data
  const generateTestData = useCallback(() => {
    setIsRunning(true);
    try {
      const bacteria = generateTestBacteria(
        populationSize[0],
        resistanceRatio[0] / 100,
        clustered
      );
      setTestBacteria(bacteria);
      console.log(`✅ Generated ${bacteria.length} test bacteria`);
      console.log(`📊 Resistance ratio: ${resistanceRatio[0].toFixed(1)}%`);
      console.log(`🔬 Clustered: ${clustered ? "Yes" : "No"}`);
    } catch (error) {
      console.error("❌ Error generating test data:", error);
    } finally {
      setIsRunning(false);
    }
  }, [populationSize, resistanceRatio, clustered]);

  // Run performance test
  const runPerformanceTest = useCallback(async () => {
    if (testBacteria.length === 0) {
      console.log("⚠️ Please generate test data first");
      return;
    }

    setIsRunning(true);

    try {
      console.log("\n🚀 Starting Performance Test");
      console.log(`Population: ${testBacteria.length} bacteria`);
      console.log(`Max Display: ${maxDisplayNodes[0]} nodes`);
      console.log(`Test Mode: ${testMode}`);
      console.log(`Spatial Sampling: ${enableSpatialSampling ? "On" : "Off"}`);
      console.log("=".repeat(50));

      // Test culling performance
      const cullingTestResult = await testRunner.current.runTest(
        `Culling (${testMode})`,
        () => {
          switch (testMode) {
            case "basic":
              return cullNodesForDisplay(testBacteria, maxDisplayNodes[0]);
            case "spatial":
              return cullNodesWithSpatialDistribution(
                testBacteria,
                maxDisplayNodes[0],
                enableSpatialSampling
              );
            case "density":
              return cullNodesWithDensityAwareness(
                testBacteria,
                maxDisplayNodes[0]
              );
            default:
              return cullNodesForDisplay(testBacteria, maxDisplayNodes[0]);
          }
        },
        3
      );

      // Test cached culling
      const cachedTestResult = await testRunner.current.runTest(
        "Cached Culling",
        () => {
          return nodeCuller.current.getCulledNodes(
            testBacteria,
            maxDisplayNodes[0],
            enableSpatialSampling
          );
        },
        5
      );

      // Validate accuracy
      const culledData = cullNodesWithSpatialDistribution(
        testBacteria,
        maxDisplayNodes[0],
        enableSpatialSampling
      );

      const accuracyValidation = validateCullingAccuracy(
        testBacteria,
        culledData
      );
      const spatialValidation = validateSpatialDistribution(
        testBacteria,
        culledData
      );
      const memoryEstimate = estimateMemoryUsage(testBacteria.length);

      console.log("🎯 Validation Results:");
      console.log(
        `   Accuracy: ${accuracyValidation.isValid ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `   Original Resistance: ${(
          accuracyValidation.originalRatio * 100
        ).toFixed(1)}%`
      );
      console.log(
        `   Culled Resistance: ${(accuracyValidation.culledRatio * 100).toFixed(
          1
        )}%`
      );
      console.log(
        `   Difference: ${(accuracyValidation.difference * 100).toFixed(2)}%`
      );
      console.log(
        `   Spatial Coverage: ${spatialValidation.coverage.toFixed(1)}%`
      );
      console.log(
        `   Memory Estimate: ${memoryEstimate.estimatedMB.toFixed(1)} MB`
      );

      // Store test result
      const testResult: TestResult = {
        scenario: `${testBacteria.length} bacteria`,
        populationSize: testBacteria.length,
        cullingTime: cullingTestResult.average,
        renderTime: cachedTestResult.average,
        memoryEstimate: memoryEstimate.estimatedMB,
        accuracyValidation,
        spatialValidation,
      };

      setTestResults((prev) => [...prev, testResult]);
    } catch (error) {
      console.error("❌ Performance test failed:", error);
    } finally {
      setIsRunning(false);
    }
  }, [testBacteria, maxDisplayNodes, testMode, enableSpatialSampling]);

  // Run comprehensive benchmark
  const runBenchmark = useCallback(async () => {
    setIsRunning(true);
    setTestResults([]);

    console.log("\n🏁 Starting Comprehensive Benchmark");
    console.log("=".repeat(50));

    try {
      for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
        if (key === "extreme" && scenario.count > 20000) {
          console.log(`⏭️ Skipping ${scenario.name} (too large for web demo)`);
          continue;
        }

        console.log(`\n📊 Testing ${scenario.name}`);

        const bacteria = generateTestBacteria(scenario.count, 0.3, false);

        const cullingResult = await testRunner.current.runTest(
          `${scenario.name} - Culling`,
          () => cullNodesWithSpatialDistribution(bacteria, 1000, true),
          3
        );

        const accuracyValidation = validateCullingAccuracy(
          bacteria,
          cullNodesWithSpatialDistribution(bacteria, 1000, true)
        );

        const spatialValidation = validateSpatialDistribution(
          bacteria,
          cullNodesWithSpatialDistribution(bacteria, 1000, true)
        );

        const memoryEstimate = estimateMemoryUsage(bacteria.length);

        const result: TestResult = {
          scenario: scenario.name,
          populationSize: scenario.count,
          cullingTime: cullingResult.average,
          renderTime: 0, // Not measuring render time in benchmark
          memoryEstimate: memoryEstimate.estimatedMB,
          accuracyValidation,
          spatialValidation,
        };

        setTestResults((prev) => [...prev, result]);
      }

      console.log("\n🎉 Benchmark Complete!");
    } catch (error) {
      console.error("❌ Benchmark failed:", error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Test Controls */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <LuTestTube className="h-5 w-5 mr-2 text-cyan-400" />
            Performance Testing Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Population Size */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Population Size: {populationSize[0].toLocaleString()}
            </label>
            <Slider
              value={populationSize}
              onValueChange={setPopulationSize}
              max={25000}
              min={100}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>100</span>
              <span>25,000</span>
            </div>
          </div>

          {/* Max Display Nodes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Max Display Nodes: {maxDisplayNodes[0]}
            </label>
            <Slider
              value={maxDisplayNodes}
              onValueChange={setMaxDisplayNodes}
              max={2000}
              min={100}
              step={50}
              className="w-full"
            />
          </div>

          {/* Resistance Ratio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Resistance Ratio: {resistanceRatio[0]}%
            </label>
            <Slider
              value={resistanceRatio}
              onValueChange={setResistanceRatio}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>

          {/* Switches */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="clustered"
                checked={clustered}
                onCheckedChange={setClustered}
              />
              <label htmlFor="clustered" className="text-sm text-gray-300">
                Clustered Distribution
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="spatial"
                checked={enableSpatialSampling}
                onCheckedChange={setEnableSpatialSampling}
              />
              <label htmlFor="spatial" className="text-sm text-gray-300">
                Spatial Sampling
              </label>
            </div>
          </div>

          {/* Test Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Test Mode
            </label>
            <div className="flex space-x-2">
              {(["basic", "spatial", "density"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={testMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTestMode(mode)}
                  className="capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={generateTestData}
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? (
                <LuRefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LuPlay className="h-4 w-4 mr-2" />
              )}
              Generate Test Data
            </Button>

            <Button
              onClick={runPerformanceTest}
              disabled={isRunning || testBacteria.length === 0}
              variant="outline"
            >
              <LuZap className="h-4 w-4 mr-2" />
              Test Performance
            </Button>

            <Button
              onClick={runBenchmark}
              disabled={isRunning}
              variant="secondary"
            >
              <LuChartBar className="h-4 w-4 mr-2" />
              Benchmark
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      {testBacteria.length > 0 && (
        <Card className="border-gray-600 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span>Test Visualization</span>
              <div className="flex space-x-2">
                <Badge variant="outline">
                  {testBacteria.length.toLocaleString()} bacteria
                </Badge>
                <Badge variant="outline">Max {maxDisplayNodes[0]} shown</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[600px] min-h-[400px] relative">
              <PetriDish
                bacteria={testBacteria}
                width={800}
                height={600}
                maxDisplayNodes={maxDisplayNodes[0]}
                enableSpatialSampling={enableSpatialSampling}
                isSimulationRunning={false}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card className="border-gray-600 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="border border-gray-600 rounded-lg p-4 bg-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">
                      {result.scenario}
                    </h3>
                    <Badge
                      variant={
                        result.accuracyValidation.isValid
                          ? "default"
                          : "destructive"
                      }
                    >
                      {result.accuracyValidation.isValid
                        ? "✅ Valid"
                        : "❌ Failed"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Population</div>
                      <div className="text-white font-mono">
                        {result.populationSize.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">Culling Time</div>
                      <div className="text-cyan-400 font-mono">
                        {result.cullingTime.toFixed(2)}ms
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">Memory Est.</div>
                      <div className="text-purple-400 font-mono">
                        {result.memoryEstimate.toFixed(1)}MB
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400">Spatial Coverage</div>
                      <div className="text-green-400 font-mono">
                        {result.spatialValidation.coverage.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
                    Resistance Accuracy: Original{" "}
                    {(result.accuracyValidation.originalRatio * 100).toFixed(1)}
                    % → Culled{" "}
                    {(result.accuracyValidation.culledRatio * 100).toFixed(1)}%
                    (Δ{(result.accuracyValidation.difference * 100).toFixed(2)}
                    %)
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
