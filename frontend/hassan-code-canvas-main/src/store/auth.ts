import { useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  latestMatchScore?: number | null;
  latestPredictedCategory?: string | null;
  latestStatus?: string | null;
  lastAnalysisAt?: string | null;
  lastAnalysisSource?: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000").replace(/\/$/, "");
const AUTH_STORAGE_KEY = "talentminer_auth";

let state: AuthState = { token: null, user: null, isReady: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const saveAuthState = () => {
  if (!state.token || !state.user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: state.token, user: state.user }));
};

const authHeaders = () =>
  state.token
    ? {
        Authorization: `Bearer ${state.token}`,
      }
    : {};

export const authStore = {
  get: () => state,
  setTokenAndUser: (token: string, user: AuthUser) => {
    state = { ...state, token, user, isReady: true };
    saveAuthState();
    emit();
  },
  clear: () => {
    state = { token: null, user: null, isReady: true };
    saveAuthState();
    emit();
  },
  setReady: () => {
    state = { ...state, isReady: true };
    emit();
  },
};

export const useAuth = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return state;
};

export const initAuth = async (): Promise<void> => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      authStore.setReady();
      return;
    }

    const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
    if (!parsed.token || !parsed.user) {
      authStore.clear();
      return;
    }

    state = { token: parsed.token, user: parsed.user, isReady: false };

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${parsed.token}`,
      },
    });

    if (!response.ok) {
      authStore.clear();
      return;
    }

    const data = (await response.json()) as { user: AuthUser };
    authStore.setTokenAndUser(parsed.token, data.user);
  } catch {
    authStore.clear();
  }
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = "error" in data && data.error ? data.error : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

export const signup = async (payload: { name: string; email: string; password: string }) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ token: string; user: AuthUser }>(response);
  authStore.setTokenAndUser(data.token, data.user);
  return data.user;
};

export const login = async (payload: { email: string; password: string }) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ token: string; user: AuthUser }>(response);
  authStore.setTokenAndUser(data.token, data.user);
  return data.user;
};

export const logout = async () => {
  try {
    if (state.token) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          ...authHeaders(),
        },
      });
    }
  } finally {
    authStore.clear();
  }
};

export const updateProfile = async (payload: { name: string; email: string }) => {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ user: AuthUser }>(response);
  if (state.token) {
    authStore.setTokenAndUser(state.token, data.user);
  }
  return data.user;
};

export const changePassword = async (payload: { currentPassword: string; newPassword: string }) => {
  const response = await fetch(`${API_BASE_URL}/api/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  await parseResponse<{ ok: boolean }>(response);
};
