import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

const AUTH_PROVIDER_TEMPLATE = `import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/auth';

interface AuthContextValue {
  isLoading: boolean;
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthContextValue['session']>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      async refreshSession() {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      },
    }),
    [isLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
`;

const AUTH_LIB_TEMPLATE = `import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: ExpoSecureStoreAdapter,
  },
});

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
`;

const SIGN_IN_TEMPLATE = `import { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { signInWithEmail } from '../../lib/auth';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('ログインに成功しました。');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ログイン</Text>
      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="ログイン" onPress={handleSignIn} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  message: {
    marginTop: 12,
    color: '#555',
  },
});
`;

const SIGN_UP_TEMPLATE = `import { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { signUpWithEmail } from '../../lib/auth';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    const { error } = await signUpWithEmail(email, password);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('登録確認メールを送信しました。受信箱をご確認ください。');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>新規登録</Text>
      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="登録する" onPress={handleSignUp} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  message: {
    marginTop: 12,
    color: '#555',
  },
});
`;

export async function setupExpoAuth(config: ProjectConfig) {
    const libDir = path.join(config.projectPath, 'lib');
    const componentsDir = path.join(config.projectPath, 'components', 'auth');
    const authScreensDir = path.join(config.projectPath, 'app', '(auth)');

    await fs.ensureDir(libDir);
    await fs.ensureDir(componentsDir);
    await fs.ensureDir(authScreensDir);

    await fs.writeFile(path.join(libDir, 'auth.ts'), AUTH_LIB_TEMPLATE);
    await fs.writeFile(path.join(componentsDir, 'AuthProvider.tsx'), AUTH_PROVIDER_TEMPLATE);
    await fs.writeFile(path.join(authScreensDir, 'sign-in.tsx'), SIGN_IN_TEMPLATE);
    await fs.writeFile(path.join(authScreensDir, 'sign-up.tsx'), SIGN_UP_TEMPLATE);
}
