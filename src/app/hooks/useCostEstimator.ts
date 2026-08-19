import { useDeferredValue, useState } from "react";

export interface CostInputState {
  dailyInput: string;
  setDailyInput: (v: string) => void;
  dailyOutput: string;
  setDailyOutput: (v: string) => void;
  dailyReasoning: string;
  setDailyReasoning: (v: string) => void;
  cacheHitRate: string;
  setCacheHitRate: (v: string) => void;
  daysPerMonth: string;
  setDaysPerMonth: (v: string) => void;
}

export interface CostEstimatorState extends CostInputState {
  calcInput: number;
  calcOutput: number;
  calcReasoning: number;
  calcCache: number;
  calcDays: number;
}

export function useCostEstimator(): CostEstimatorState {
  const [dailyInput, setDailyInput] = useState("2");
  const [dailyOutput, setDailyOutput] = useState("1");
  const [dailyReasoning, setDailyReasoning] = useState("2");
  const [cacheHitRate, setCacheHitRate] = useState("50");
  const [daysPerMonth, setDaysPerMonth] = useState("22");

  const deferredInput = useDeferredValue(dailyInput);
  const deferredOutput = useDeferredValue(dailyOutput);
  const deferredReasoning = useDeferredValue(dailyReasoning);
  const deferredCache = useDeferredValue(cacheHitRate);
  const deferredDays = useDeferredValue(daysPerMonth);

  const calcInput = Math.max(0, Number(deferredInput) || 0);
  const calcOutput = Math.max(0, Number(deferredOutput) || 0);
  const calcReasoning = Math.max(0, Number(deferredReasoning) || 0);
  const calcCache = Math.max(0, Math.min(100, Number(deferredCache) || 0)) / 100;
  const calcDays = Math.max(1, Number(deferredDays) || 0);

  return {
    dailyInput,
    setDailyInput,
    dailyOutput,
    setDailyOutput,
    dailyReasoning,
    setDailyReasoning,
    cacheHitRate,
    setCacheHitRate,
    daysPerMonth,
    setDaysPerMonth,
    calcInput,
    calcOutput,
    calcReasoning,
    calcCache,
    calcDays,
  };
}
