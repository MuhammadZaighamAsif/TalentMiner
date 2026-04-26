// Lightweight global store for the simulated resume analysis flow.
// Uses a tiny pub/sub so any page can read/update without extra deps.
import { useEffect, useState } from "react";
import { authStore } from "@/store/auth";

export interface AnalysisResult {
  score: number;
  status: "Good Match" | "Average Match" | "Poor Match";
  predictedCategory?: string;
  matched: string[];
  missing: string[];
  suggestions: string[];
  fileName: string;
}

interface State {
  file: File | null;
  resumeText: string;
  jobDesc: string;
  result: AnalysisResult | null;
}

let state: State = { file: null, resumeText: "", jobDesc: "", result: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const analysisStore = {
  get: () => state,
  setFile: (file: File | null) => { state = { ...state, file }; emit(); },
  setResumeText: (resumeText: string) => { state = { ...state, resumeText }; emit(); },
  setJobDesc: (jobDesc: string) => { state = { ...state, jobDesc }; emit(); },
  setResult: (result: AnalysisResult | null) => { state = { ...state, result }; emit(); },
  reset: () => { state = { file: null, resumeText: "", jobDesc: "", result: null }; emit(); },
};

export const useAnalysis = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return state;
};

export const LOADING_STEPS = [
  "Extracting resume...",
  "Cleaning text...",
  "Matching skills...",
  "Generating insights...",
];

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000").replace(/\/$/, "");

export type BackendHealthResponse = {
  status: string;
  modelReady: boolean;
  message: string;
  bertReady?: boolean;
  bertEnabled?: boolean;
  pdfParsingAvailable?: boolean;
};

type BackendAnalysisResponse = {
  score: number;
  status: "Good Match" | "Average Match" | "Poor Match";
  predictedCategory?: string;
  matched: string[];
  missing: string[];
  suggestions: string[];
};

export const runAnalysis = async (payload: {
  resumeText: string;
  jobDescription: string;
  fileName: string;
}): Promise<AnalysisResult> => {
  const token = authStore.get().token;
  const response = await fetch(`${API_BASE_URL}/api/analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      resumeText: payload.resumeText,
      jobDescription: payload.jobDescription,
    }),
  });

  const data = (await response.json()) as BackendAnalysisResponse | { error?: string };

  if (!response.ok) {
    const message = "error" in data && data.error ? data.error : "Analysis failed";
    throw new Error(message);
  }

  const typed = data as BackendAnalysisResponse;
  return {
    score: typed.score,
    status: typed.status,
    predictedCategory: typed.predictedCategory,
    matched: typed.matched,
    missing: typed.missing,
    suggestions: typed.suggestions,
    fileName: payload.fileName,
  };
};

export const getBackendHealth = async (): Promise<BackendHealthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: "GET",
  });

  const data = (await response.json()) as BackendHealthResponse | { error?: string };
  if (!response.ok) {
    const message = "error" in data && data.error ? data.error : "Backend health check failed";
    throw new Error(message);
  }

  return data as BackendHealthResponse;
};
