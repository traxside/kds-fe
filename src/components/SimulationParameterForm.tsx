"use client";

import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Settings,
  Play,
  RotateCcw,
  Info,
  Loader2,
  Zap,
  Users,
  Activity,
  Shield,
  Clock,
  RulerDimensionLine,
} from "lucide-react";
import {
  SimulationParametersInput,
  simulationParametersSchema,
  simulationPresets,
} from "@/types/simulation";

interface SimulationParameterFormProps {
  onSubmit: (parameters: SimulationParametersInput) => void;
  isLoading?: boolean;
  defaultValues?: Partial<SimulationParametersInput>;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const colors = {
  surface: {
    a0: "#121212",
    a10: "#282828",
    a20: "#3f3f3f",
    a30: "#575757",
    a40: "#717171",
    a50: "#8b8b8b",
  },
  surfaceTonal: {
    a0: "#1a2623",
    a10: "#2f3a38",
    a20: "#46504d",
    a30: "#5e6764",
    a40: "#767e7c",
    a50: "#909795",
  },
  primary: {
    a0: "#01fbd9",
    a10: "#51fcdd",
    a20: "#73fde1",
    a30: "#8dfee5",
    a40: "#a4feea",
    a50: "#b8ffee",
  },
  light: "#ffffff",
};

const SimulationParameterForm: React.FC<SimulationParameterFormProps> = ({
   onSubmit,
   isLoading = false,
   defaultValues,
   disabled = false,
   style
}) => {
  const form = useForm<SimulationParametersInput>({
    resolver: zodResolver(simulationParametersSchema),
    defaultValues: {
      initialPopulation: 25,
      growthRate: 0.1,
      antibioticConcentration: 0.0,
      mutationRate: 0.02,
      duration: 30,
      petriDishSize: 600,
      ...defaultValues,
    },
  });

  const handleSubmit = useCallback((data: SimulationParametersInput) => {
    console.log('[SimulationParameterForm] Form submitted with data:', data);
    console.log('[SimulationParameterForm] Form state:', {
      isValid: form.formState.isValid,
      isSubmitting: form.formState.isSubmitting,
      errors: form.formState.errors,
    });
    onSubmit(data);
  }, [onSubmit, form.formState]);
  
  // Alternative direct submit handler
  const handleDirectSubmit = useCallback(() => {
    console.log('[SimulationParameterForm] ===== Direct submit called =====');
    try {
      const formValues = form.getValues();
      console.log('[SimulationParameterForm] Direct submit with values:', formValues);
      console.log('[SimulationParameterForm] About to call onSubmit...');
      onSubmit(formValues);
      console.log('[SimulationParameterForm] onSubmit called successfully');
    } catch (error) {
      console.error('[SimulationParameterForm] Error in direct submit:', error);
    }
  }, [form, onSubmit]);

  const handlePresetChange = useCallback((presetKey: string) => {
    if (presetKey in simulationPresets) {
      const preset =
          simulationPresets[presetKey as keyof typeof simulationPresets];
      form.reset(preset);
    }
  }, [form]);

  const handleReset = useCallback(() => {
    form.reset(simulationPresets.default);
  }, [form]);

  return (
      <Card
          className="w-full border"
          style={{
            backgroundColor: `${colors.surface.a10}cc`,
            backdropFilter: "blur(12px)",
            borderColor: colors.surface.a20,
            ...style
          }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex flex-wrap items-center justify-between">
            <div className="flex items-center">
              <Settings
                  className="h-5 w-5 mr-2"
                  style={{ color: colors.primary.a0 }}
              />
              <span style={{ color: colors.light }}>Simulation Parameters</span>
            </div>
            <div className="flex items-center space-x-2">
              <Select onValueChange={handlePresetChange}>
                <SelectTrigger
                    className="w-32 border"
                    style={{
                      backgroundColor: `${colors.surface.a20}80`,
                      backdropFilter: "blur(8px)",
                      borderColor: colors.surface.a30,
                      color: colors.light
                    }}
                >
                  <SelectValue placeholder="Presets" />
                </SelectTrigger>
                <SelectContent
                    className="border"
                    style={{
                      backgroundColor: `${colors.surface.a10}f0`,
                      backdropFilter: "blur(12px)",
                      borderColor: colors.surface.a20,
                      color: colors.light
                    }}
                >
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="highPressure">High Pressure</SelectItem>
                  <SelectItem value="slowEvolution">Slow Evolution</SelectItem>
                  <SelectItem value="rapidMutation">Rapid Mutation</SelectItem>
                </SelectContent>
              </Select>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={disabled || isLoading}
                  className="border"
                  style={{
                    backgroundColor: `${colors.surface.a20}80`,
                    backdropFilter: "blur(8px)",
                    borderColor: colors.surface.a30,
                    color: colors.light
                  }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Form {...form}>
              <form className="space-y-4">
                {/* One Column Layout */}
                <div className="space-y-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Initial Population */}
                    <FormField
                        control={form.control}
                        name="initialPopulation"
                        render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium flex items-center">
                                  <Users
                                      className="h-4 w-4 mr-2"
                                      style={{ color: colors.primary.a0 }}
                                  />
                                  <span style={{ color: colors.light }}>Initial Population</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 mr-2 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="border"
                                        style={{
                                          backgroundColor: `${colors.surface.a10}f0`,
                                          backdropFilter: "blur(12px)",
                                          borderColor: colors.surface.a20,
                                          color: colors.light
                                        }}
                                    >
                                      <p>
                                        Number of bacteria at simulation start
                                        (5-100)
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <Badge
                                    variant="outline"
                                    className="text-xs border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}80`,
                                      borderColor: colors.surface.a30,
                                      color: colors.light
                                    }}
                                >
                                  {field.value}
                                </Badge>
                              </div>
                              <FormControl>
                                <div
                                    className="relative p-1 rounded-lg border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}40`,
                                      borderColor: colors.surface.a30,
                                    }}
                                >
                                  <Input
                                      type="range"
                                      min="5"
                                      max="100"
                                      step="1"
                                      {...field}
                                      onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                      }
                                      className="w-full bg-transparent border-0 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-track]:bg-gray-600"
                                      disabled={disabled}
                                  />
                                </div>
                              </FormControl>
                              <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                                <span>5</span>
                                <span>100</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Growth Rate */}
                    <FormField
                        control={form.control}
                        name="growthRate"
                        render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium flex items-center">
                                  <Activity
                                      className="h-4 w-4 mr-2"
                                      style={{ color: colors.primary.a0 }}
                                  />
                                  <span style={{ color: colors.light }}>Growth Rate</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 mr-2 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="border"
                                        style={{
                                          backgroundColor: `${colors.surface.a10}f0`,
                                          backdropFilter: "blur(12px)",
                                          borderColor: colors.surface.a20,
                                          color: colors.light
                                        }}
                                    >
                                      <p>
                                        Rate of bacterial reproduction per generation
                                        (0.1% - 100%)
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <Badge
                                    variant="outline"
                                    className="text-xs border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}80`,
                                      borderColor: colors.surface.a30,
                                      color: colors.light
                                    }}
                                >
                                  {(field.value * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <FormControl>
                                <div
                                    className="relative p-1 rounded-lg border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}40`,
                                      borderColor: colors.surface.a30,
                                    }}
                                >
                                  <Input
                                      type="range"
                                      min="0.001"
                                      max="1"
                                      step="0.001"
                                      {...field}
                                      onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                      }
                                      className="w-full bg-transparent border-0 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-track]:bg-gray-600"
                                      disabled={disabled}
                                  />
                                </div>
                              </FormControl>
                              <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                                <span>0.1%</span>
                                <span>100%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Antibiotic Concentration */}
                    <FormField
                        control={form.control}
                        name="antibioticConcentration"
                        render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium flex items-center">
                                  <Shield
                                      className="h-4 w-4 mr-2"
                                      style={{ color: colors.primary.a0 }}
                                  />
                                  <span style={{ color: colors.light }}>Antibiotic Concentration</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 mr-2 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="border"
                                        style={{
                                          backgroundColor: `${colors.surface.a10}f0`,
                                          backdropFilter: "blur(12px)",
                                          borderColor: colors.surface.a20,
                                          color: colors.light
                                        }}
                                    >
                                      <p>
                                        Strength of selective pressure against
                                        sensitive bacteria (0% - 100%)
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <Badge
                                    variant="outline"
                                    className="text-xs border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}80`,
                                      borderColor: colors.surface.a30,
                                      color: colors.light
                                    }}
                                >
                                  {(field.value * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <FormControl>
                                <div
                                    className="relative p-1 rounded-lg border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}40`,
                                      borderColor: colors.surface.a30,
                                    }}
                                >
                                  <Input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.01"
                                      {...field}
                                      onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                      }
                                      className="w-full bg-transparent border-0 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-track]:bg-gray-600"
                                      disabled={disabled}
                                  />
                                </div>
                              </FormControl>
                              <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                                <span>0%</span>
                                <span>100%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Mutation Rate */}
                    <FormField
                        control={form.control}
                        name="mutationRate"
                        render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium flex items-center">
                                  <Zap
                                      className="h-4 w-4 mr-2"
                                      style={{ color: colors.primary.a0 }}
                                  />
                                  <span style={{ color: colors.light }}>Mutation Rate</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 mr-2 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="border"
                                        style={{
                                          backgroundColor: `${colors.surface.a10}f0`,
                                          backdropFilter: "blur(12px)",
                                          borderColor: colors.surface.a20,
                                          color: colors.light
                                        }}
                                    >
                                      <p>
                                        Probability of resistance mutations per
                                        generation (0% - 10%)
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <Badge
                                    variant="outline"
                                    className="text-xs border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}80`,
                                      borderColor: colors.surface.a30,
                                      color: colors.light
                                    }}
                                >
                                  {(field.value * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <FormControl>
                                <div
                                    className="relative p-1 rounded-lg border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}40`,
                                      borderColor: colors.surface.a30,
                                    }}
                                >
                                  <Input
                                      type="range"
                                      min="0"
                                      max="0.1"
                                      step="0.001"
                                      {...field}
                                      onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                      }
                                      className="w-full bg-transparent border-0 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-track]:bg-gray-600"
                                      disabled={disabled}
                                  />
                                </div>
                              </FormControl>
                              <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                                <span>0%</span>
                                <span>10%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Duration */}
                    <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium flex items-center">
                                  <Clock
                                      className="h-4 w-4 mr-2"
                                      style={{ color: colors.primary.a0 }}
                                  />
                                  <span style={{ color: colors.light }}>Duration (Generations)</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 mr-2 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="border"
                                        style={{
                                          backgroundColor: `${colors.surface.a10}f0`,
                                          backdropFilter: "blur(12px)",
                                          borderColor: colors.surface.a20,
                                          color: colors.light
                                        }}
                                    >
                                      <p>
                                        Number of generations to simulate (5-50)
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <Badge
                                    variant="outline"
                                    className="text-xs border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}80`,
                                      borderColor: colors.surface.a30,
                                      color: colors.light
                                    }}
                                >
                                  {field.value}
                                </Badge>
                              </div>
                              <FormControl>
                                <div
                                    className="relative p-1 rounded-lg border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}40`,
                                      borderColor: colors.surface.a30,
                                    }}
                                >
                                  <Input
                                      type="range"
                                      min="5"
                                      max="50"
                                      step="1"
                                      {...field}
                                      onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                      }
                                      className="w-full bg-transparent border-0 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-track]:bg-gray-600"
                                      disabled={disabled}
                                  />
                                </div>
                              </FormControl>
                              <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                                <span>5</span>
                                <span>50</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Petri Dish Size */}
                    <FormField
                        control={form.control}
                        name="petriDishSize"
                        render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium flex items-center">
                                  <RulerDimensionLine
                                      className="h-4 w-4 mr-2"
                                      style={{ color: colors.primary.a0 }}
                                  />
                                  <span style={{ color: colors.light }}>Petri Dish Size</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 mr-2 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                        className="border"
                                        style={{
                                          backgroundColor: `${colors.surface.a10}f0`,
                                          backdropFilter: "blur(12px)",
                                          borderColor: colors.surface.a20,
                                          color: colors.light
                                        }}
                                    >
                                      <p>
                                        Visualization area size in pixels (100-800)
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <Badge
                                    variant="outline"
                                    className="text-xs border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}80`,
                                      borderColor: colors.surface.a30,
                                      color: colors.light
                                    }}
                                >
                                  {field.value}px
                                </Badge>
                              </div>
                              <FormControl>
                                <div
                                    className="relative p-1 rounded-lg border"
                                    style={{
                                      backgroundColor: `${colors.surface.a20}40`,
                                      borderColor: colors.surface.a30,
                                    }}
                                >
                                  <Input
                                      type="range"
                                      min="100"
                                      max="800"
                                      step="50"
                                      {...field}
                                      onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                      }
                                      className="w-full bg-transparent border-0 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-track]:bg-gray-600"
                                      disabled={disabled}
                                  />
                                </div>
                              </FormControl>
                              <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                                <span>100px</span>
                                <span>800px</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                        )}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                      type="button"
                      className="w-full border"
                      disabled={disabled || isLoading}
                      onClick={handleDirectSubmit}
                      style={{
                        backgroundColor: `${colors.primary.a0}cc`,
                        borderColor: colors.primary.a0,
                        color: colors.surface.a0,
                      }}
                  >
                    {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting Simulation...
                        </>
                    ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Simulation
                        </>
                    )}
                  </Button>

                </div>
              </form>
            </Form>
          </TooltipProvider>
        </CardContent>
      </Card>
  );
};

export default SimulationParameterForm;
