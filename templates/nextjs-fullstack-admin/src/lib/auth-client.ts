'use client';

import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const runtimeBaseURL =
    typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const authClient = createAuthClient({
    baseURL: runtimeBaseURL,
    plugins: [organizationClient()],
});

export const { useSession, signIn, signOut } = authClient;
