import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";

interface User {
  id: string;
  email: string;
  name: string;
  omConnected: boolean;
}

export const useAuth = () => {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const { openUserProfile } = useClerk();

  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    name: clerkUser.fullName || clerkUser.username || "User",
    omConnected: true, // We assume true for now, can be synced later
  } : null;

  return {
    user,
    token: null, // Clerk tokens are fetched via getToken() async
    login: () => {}, // Handled by Clerk components
    logout: signOut,
    isLoading: !isUserLoaded,
    getToken,
    openUserProfile
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>; // No longer needed as ClerkProvider is in App.tsx
};
