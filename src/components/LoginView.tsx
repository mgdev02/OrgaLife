import { Loader2 } from "lucide-react";
import { useNativePlatform } from "../hooks/useNativePlatform";

interface LoginViewProps {
  onLogin: () => void;
  loading: boolean;
  error: string | null;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginView({ onLogin, loading, error }: LoginViewProps) {
  const platform = useNativePlatform();
  const isMac = platform === "darwin";

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0c0f] text-neutral-100 antialiased">
      <div
        data-tauri-drag-region=""
        className={`h-11 w-full shrink-0 ${isMac ? "pl-20" : ""}`}
        aria-hidden
      />

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-100">
              OrgaLife
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Panel de organización personal
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              data-tauri-no-drag=""
              onClick={onLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08]
                         bg-white/[0.04] px-4 py-3 text-sm font-medium text-neutral-200
                         transition-all hover:bg-white/[0.08] hover:text-white
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              {loading ? "Iniciando sesion..." : "Iniciar sesion con Google"}
            </button>

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-center text-xs text-red-400">
                {error}
              </p>
            )}
          </div>

          <p className="text-center text-xs text-neutral-600">
            Tus datos se sincronizan de forma segura con Google Drive.
          </p>
        </div>
      </div>
    </div>
  );
}
