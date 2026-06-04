import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useSync } from "./hooks/useSync";
import { useCalendar } from "./hooks/useCalendar";
import usePersistedState from "./hooks/usePersistedState";
import { setSyncNotify } from "./hooks/usePersistedState";
import LoginView from "./components/LoginView";
import AppHeader from "./components/AppHeader";
import Dashboard from "./components/Dashboard";
import type { FocusMode } from "./components/AppHeader";
import type { UserProfile } from "./types/auth";

function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c0f]">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
    </div>
  );
}

function AuthenticatedApp({
  user,
  onLogout,
}: {
  user: UserProfile;
  onLogout: () => void;
}) {
  const [focus, setFocus] = useState<FocusMode>("todo");
  const [locked, setLocked] = usePersistedState<boolean>("ui_locked", false);
  const { status: syncStatus, schedulePush, forceSync } = useSync();
  const {
    events: calendarEvents,
    fromCache: calendarFromCache,
    error: calendarError,
    loading: calendarLoading,
  } = useCalendar(syncStatus);

  useEffect(() => {
    setSyncNotify(schedulePush);
    return () => setSyncNotify(null);
  }, [schedulePush]);

  return (
    <div
      className={`min-h-screen bg-[#0c0c0f] text-neutral-100 antialiased${locked ? " execution-mode" : ""}`}
    >
      <AppHeader
        user={user}
        onLogout={onLogout}
        focus={focus}
        onFocusChange={setFocus}
        locked={locked}
        onLockedChange={setLocked}
        syncStatus={syncStatus}
        onSyncRetry={forceSync}
      />
      <Dashboard
        focus={focus}
        locked={locked}
        calendarEvents={calendarEvents}
        calendarFromCache={calendarFromCache}
        calendarError={calendarError}
        calendarLoading={calendarLoading}
      />
    </div>
  );
}

export default function App() {
  const { status, user, error, login, logout } = useAuth();

  if (status === "loading") return <SplashScreen />;

  if (status === "unauthenticated" || !user) {
    return <LoginView onLogin={login} loading={false} error={error} />;
  }

  return <AuthenticatedApp user={user} onLogout={logout} />;
}
