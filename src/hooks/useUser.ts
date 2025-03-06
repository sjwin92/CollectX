
// Mock user hook for now
export interface User {
  id: string;
  username: string;
  email: string;
}

export function useUser() {
  // This is a mock implementation
  const user: User = {
    id: "user-1",
    username: "MockUser",
    email: "user@example.com"
  };
  
  return { user, isLoaded: true, isSignedIn: true };
}
