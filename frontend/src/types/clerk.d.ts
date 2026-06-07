// src/types/clerk.d.ts
//
// Tells TypeScript that `window.Clerk` exists.
// Clerk's React SDK injects this globally after <ClerkProvider> mounts.

interface ClerkSession {
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>;
}

interface ClerkClient {
  session: ClerkSession | null;
}

declare global {
  interface Window {
    Clerk?: ClerkClient;
  }
}

export { };
