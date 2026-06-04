export interface UserProfile {
  email: string;
  name: string;
  picture: string;
}

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  error: string | null;
}
