import { useCallback, useEffect, useState } from "react";
import type { AuthState } from "../types/auth";
import * as authAPI from "../lib/authAPI";

const INITIAL_STATE: AuthState = {
  status: "loading",
  user: null,
  error: null,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  useEffect(() => {
    authAPI
      .checkSession()
      .then((user) =>
        setState({
          status: user ? "authenticated" : "unauthenticated",
          user,
          error: null,
        }),
      )
      .catch(() =>
        setState({ status: "unauthenticated", user: null, error: null }),
      );
  }, []);

  const login = useCallback(async () => {
    setState((s) => ({ ...s, error: null, status: "loading" }));
    try {
      const user = await authAPI.startLogin();
      setState({ status: "authenticated", user, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      setState({ status: "unauthenticated", user: null, error: message });
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setState({ status: "unauthenticated", user: null, error: null });
    }
  }, []);

  return {
    status: state.status,
    user: state.user,
    error: state.error,
    login,
    logout: handleLogout,
  } as const;
}
