// src/pages/Settings.tsx
//
// User preferences page.
// Future: Language switch (EN/VI), theme toggle (light/dark).

import { UserProfile } from '@clerk/react';

export default function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-headline-xl text-primary">Settings</h1>
      <p className="text-body-lg text-muted-foreground">
        Manage your account and preferences.
      </p>

      {/* Clerk's built-in profile management component */}
      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full',
            cardBox: 'shadow-none border border-border/50 rounded-xl',
          },
        }}
      />
    </div>
  );
}
