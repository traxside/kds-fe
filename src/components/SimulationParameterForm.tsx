"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  FormDescription,
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
  Monitor,
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
}

export default function SimulationParameterForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  disabled = false,
}: SimulationParameterFormProps) {
  const form = useForm<SimulationParametersInput>({
    resolver: zodResolver(simulationParametersSchema),
    defaultValues: {
      initialPopulation: 50,
      growthRate: 0.1,
      antibioticConcentration: 0.0,
      mutationRate: 0.02,
      duration: 100,
      petriDishSize: 600,
      ...defaultValues,
    },
  });

  const handleSubmit = (data: SimulationParametersInput) => {
    onSubmit(data);
  };

  const handlePresetChange = (presetKey: string) => {
    if (presetKey in simulationPresets) {
      const preset =
        simulationPresets[presetKey as keyof typeof simulationPresets];
      form.reset(preset);
    }
  };

  const handleReset = () => {
    form.reset(simulationPresets.default);
  };

  const watchedValues = form.watch();

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-green-600" />
            Simulation Parameters
          </div>
          <div className="flex items-center space-x-2">
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Presets" />
              </SelectTrigger>
              <SelectContent>
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
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Initial Population */}
              <FormField
                control={form.control}
                name="initialPopulation"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium flex items-center">
                        <Users className="h-4 w-4 mr-2 text-blue-600" />
                        Initial Population
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Number of bacteria at simulation start (1-1000)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {field.value}
                      </Badge>
                    </div>
                    <FormControl>
                      <Input
                        type="range"
                        min="1"
                        max="1000"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full"
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1</span>
                      <span>1000</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Growth Rate */}
              <FormField
                control={form.control}
                name="growthRate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-green-600" />
                        Growth Rate
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Rate of bacterial reproduction per generation
                              (0.1% - 100%)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {(field.value * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <FormControl>
                      <Input
                        type="range"
                        min="0.001"
                        max="1"
                        step="0.001"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full"
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0.1%</span>
                      <span>100%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Antibiotic Concentration */}
              <FormField
                control={form.control}
                name="antibioticConcentration"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-red-600" />
                        Antibiotic Concentration
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Strength of selective pressure against sensitive
                              bacteria (0% - 100%)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {(field.value * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <FormControl>
                      <Input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full"
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Mutation Rate */}
              <FormField
                control={form.control}
                name="mutationRate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-purple-600" />
                        Mutation Rate
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Probability of resistance mutations per generation
                              (0% - 10%)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {(field.value * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <FormControl>
                      <Input
                        type="range"
                        min="0"
                        max="0.1"
                        step="0.001"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full"
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0%</span>
                      <span>10%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-orange-600" />
                        Duration (Generations)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of generations to simulate (1-1000)</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {field.value}
                      </Badge>
                    </div>
                    <FormControl>
                      <Input
                        type="range"
                        min="1"
                        max="1000"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full"
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1</span>
                      <span>1000</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Petri Dish Size */}
              <FormField
                control={form.control}
                name="petriDishSize"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium flex items-center">
                        <Monitor className="h-4 w-4 mr-2 text-gray-600" />
                        Petri Dish Size
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualization area size in pixels (100-800)</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {field.value}px
                      </Badge>
                    </div>
                    <FormControl>
                      <Input
                        type="range"
                        min="100"
                        max="800"
                        step="50"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full"
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>100px</span>
                      <span>800px</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={disabled || isLoading || !form.formState.isValid}
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
}
