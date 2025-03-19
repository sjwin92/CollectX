
// Mock user hook for now
export interface User {
  id: string;
  username: string;
  email: string;
}

export function useUser() {
  // This is a mock implementation
  const user: User = {
    id: "user-1", // Use this ID to match messages from the current user
    username: "Current User",
    email: "user@example.com"
  };
  
  return { user, isLoaded: true, isSignedIn: true };
}
