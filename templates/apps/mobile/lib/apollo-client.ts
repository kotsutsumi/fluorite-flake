/**
 * Minimal GraphQL client tailored for the Expo mobile app.
 * - Uses the backend GraphQL endpoint via fetch
 * - Automatically attaches the stored Better Auth session token when available
 */
import { getItemAsync } from "expo-secure-store";
import type { DocumentNode } from "graphql";
import { print } from "graphql";

import { apiUrl } from "@/constants/api";

const TOKEN_KEY = "sessionToken";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
    };
  }>;
};

type RequestOptions = {
  document: DocumentNode;
  variables?: Record<string, unknown>;
  token?: string | null;
};

async function resolveToken(explicitToken?: string | null) {
  if (explicitToken) {
    return explicitToken;
  }

  try {
    const stored = await getItemAsync(TOKEN_KEY);
    return stored ?? undefined;
  } catch {
    return;
  }
}

async function executeRequest<T>({ document, variables, token }: RequestOptions) {
  const resolvedToken = await resolveToken(token);
  const response = await fetch(apiUrl("/api/graphql"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    },
    body: JSON.stringify({
      query: print(document),
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;
  return payload;
}

export const apolloClient = {
  async query<T>({
    query,
    variables,
    token,
  }: {
    query: DocumentNode;
    variables?: Record<string, unknown>;
    token?: string | null;
    fetchPolicy?: string;
  }) {
    return await executeRequest<T>({ document: query, variables, token });
  },

  async mutate<T>({
    mutation,
    variables,
    token,
  }: {
    mutation: DocumentNode;
    variables?: Record<string, unknown>;
    token?: string | null;
  }) {
    return await executeRequest<T>({ document: mutation, variables, token });
  },

  clearStore() {
    // Maintained for compatibility with existing tests; no-op for fetch implementation
    return [] as unknown[];
  },
};

// EOF
