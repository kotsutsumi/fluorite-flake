/**
 * Expo アプリからアクセス追跡を行うための統合ユーティリティ。
 *
 * Expo モバイルアプリをアクセス追跡システムと連携させるための
 * ユーティリティ関数とサンプルを提供する。
 */

export type ExpoDeviceInfo = {
  deviceId: string;
  platform: "ios" | "android";
  osVersion?: string;
  appVersion?: string;
  deviceModel?: string;
  deviceName?: string;
  pushToken?: string;
  timezone?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt?: string;
};

export type Device = {
  id: string;
  deviceId: string;
  platform: string;
  deviceModel?: string;
  appVersion?: string;
  lastSeenAt?: string;
  isActive?: boolean;
};

export type LoginResponse = {
  token: string;
  user: User;
  expiresAt: string;
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
    };
  }>;
};

const TRAILING_SLASH_REGEX = /\/$/;

export class ExpoAccessTracker {
  private readonly baseUrl: string;
  private authToken?: string;
  private deviceInfo?: ExpoDeviceInfo;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(TRAILING_SLASH_REGEX, ""); // 末尾のスラッシュを取り除く
  }

  /**
   * Expo のデバイス情報を用いてデバイス追跡を初期化する
   */
  async initializeDevice(deviceInfo: ExpoDeviceInfo): Promise<void> {
    this.deviceInfo = deviceInfo;

    // デバイス情報を登録または更新する
    const mutation = `
            mutation RegisterDevice($deviceInfo: DeviceInfoInput!, $deviceId: String!, $platform: String!) {
                registerDevice(deviceInfo: $deviceInfo, deviceId: $deviceId, platform: $platform) {
                    id
                    deviceId
                    platform
                    lastSeenAt
                }
            }
        `;

    const variables = {
      deviceInfo: {
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion,
        deviceModel: deviceInfo.deviceModel,
        deviceName: deviceInfo.deviceName,
        pushToken: deviceInfo.pushToken,
        timezone: deviceInfo.timezone,
        locale: deviceInfo.locale,
        metadata: deviceInfo.metadata ? JSON.stringify(deviceInfo.metadata) : undefined,
      },
      deviceId: deviceInfo.deviceId,
      platform: deviceInfo.platform,
    };

    await this.makeGraphQLRequest(mutation, variables);
  }

  /**
   * ユーザーを認証しアクセストークンを取得する
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const mutation = `
            mutation Login($input: LoginInput!) {
                login(input: $input) {
                    token
                    user {
                        id
                        email
                        name
                        role
                    }
                    expiresAt
                }
            }
        `;

    const variables = {
      input: {
        email,
        password,
        deviceId: this.deviceInfo?.deviceId,
        platform: this.deviceInfo?.platform,
        deviceInfo: this.deviceInfo
          ? {
              osVersion: this.deviceInfo.osVersion,
              appVersion: this.deviceInfo.appVersion,
              deviceModel: this.deviceInfo.deviceModel,
              deviceName: this.deviceInfo.deviceName,
              pushToken: this.deviceInfo.pushToken,
              timezone: this.deviceInfo.timezone,
              locale: this.deviceInfo.locale,
              metadata: this.deviceInfo.metadata
                ? JSON.stringify(this.deviceInfo.metadata)
                : undefined,
            }
          : undefined,
      },
    };

    const response = await this.makeGraphQLRequest<{ login: LoginResponse }>(mutation, variables);

    if (response.data?.login) {
      // 以降の API 呼び出しで Authorization ヘッダーに付与できるようにキャッシュ
      this.authToken = response.data.login.token;
      return response.data.login;
    }

    throw new Error("Login failed");
  }

  /**
   * アプリのアクセスや画面遷移を記録する
   */
  async trackAccess(
    path: string,
    method = "GET",
    additionalData?: {
      query?: string;
      statusCode?: number;
      responseTime?: number;
      referrer?: string;
    }
  ): Promise<void> {
    const mutation = `
            mutation LogAccess($input: AccessLogInput!) {
                logAccess(input: $input)
            }
        `;

    const variables = {
      input: {
        method,
        path,
        platform: this.deviceInfo?.platform,
        appVersion: this.deviceInfo?.appVersion,
        deviceId: this.deviceInfo?.deviceId,
        ...additionalData,
      },
    };

    await this.makeGraphQLRequest(mutation, variables);
  }

  /**
   * プッシュ通知トークンを更新する
   */
  async updatePushToken(pushToken: string): Promise<void> {
    if (!this.deviceInfo?.deviceId) {
      throw new Error("Device not initialized");
    }

    const mutation = `
            mutation UpdatePushToken($deviceId: String!, $pushToken: String!) {
                updatePushToken(deviceId: $deviceId, pushToken: $pushToken) {
                    id
                    pushToken
                }
            }
        `;

    const variables = {
      deviceId: this.deviceInfo.deviceId,
      pushToken,
    };

    await this.makeGraphQLRequest(mutation, variables);
  }

  /**
   * 現在のユーザー情報を取得する
   */
  async getCurrentUser(): Promise<User | null> {
    const query = `
            query Me {
                me {
                    id
                    email
                    name
                    role
                    createdAt
                }
            }
        `;

    const response = await this.makeGraphQLRequest<{ me: User }>(query);
    return response.data?.me || null;
  }

  /**
   * ユーザーのデバイス一覧を取得する
   */
  async getMyDevices(): Promise<Device[]> {
    const query = `
            query MyDevices {
                myDevices {
                    id
                    deviceId
                    platform
                    deviceModel
                    appVersion
                    lastSeenAt
                    isActive
                }
            }
        `;

    const response = await this.makeGraphQLRequest<{ myDevices: Device[] }>(query);
    return response.data?.myDevices || [];
  }

  /**
   * GraphQL リクエストを送信する
   */
  private async makeGraphQLRequest<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.deviceInfo?.deviceId) {
      // サーバー側でデバイスを識別できるようヘッダーを付与
      headers["x-device-id"] = this.deviceInfo.deviceId;
    }

    if (this.authToken) {
      // 認証済みであれば Bearer トークンを乗せる
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}/api/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    return result;
  }
}

/**
 * Expo 固有のデバイス情報収集
 *
 * Expo アプリでの使用例:
 *
 * ```typescript
 * import * as Device from 'expo-device';
 * import * as Application from 'expo-application';
 * import * as Localization from 'expo-localization';
 * import { Platform } from 'react-native';
 *
 * const deviceInfo = await getExpoDeviceInfo();
 * const tracker = new ExpoAccessTracker('https://your-backend.vercel.app');
 * await tracker.initializeDevice(deviceInfo);
 * ```
 */
export const expoDeviceInfoExample = `
// まず必要な Expo パッケージをインストールする:
// npx expo install expo-device expo-application expo-localization expo-notifications

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function getExpoDeviceInfo(): Promise<ExpoDeviceInfo> {
    // 永続的なデバイス ID を生成または取得する
    let deviceId = await AsyncStorage.getItem('device-id');
    if (!deviceId) {
        deviceId = await Application.getInstallationIdAsync();
        await AsyncStorage.setItem('device-id', deviceId);
    }

    // プッシュ通知トークンを取得する
    let pushToken;
    try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
            const token = await Notifications.getExpoPushTokenAsync();
            pushToken = token.data;
        }
    } catch (error) {
        logger.info('Error getting push token:', error);
    }

    return {
        deviceId,
        platform: Platform.OS as 'ios' | 'android',
        osVersion: Device.osVersion || undefined,
        appVersion: Application.nativeApplicationVersion || undefined,
        deviceModel: Device.modelName || undefined,
        deviceName: Device.deviceName || undefined,
        pushToken,
        timezone: Localization.timezone,
        locale: Localization.locale,
        metadata: {
            isDevice: Device.isDevice,
            brand: Device.brand,
            manufacturer: Device.manufacturer,
            modelId: Device.modelId,
            designName: Device.designName,
            productName: Device.productName,
            deviceYearClass: Device.deviceYearClass,
            totalMemory: Device.totalMemory,
            supportedCpuArchitectures: Device.supportedCpuArchitectures,
        },
    };
}

// React Native コンポーネントでの使用例
export function useAccessTracker() {
    const [tracker, setTracker] = useState<ExpoAccessTracker | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        initializeTracker();
    }, []);

    const initializeTracker = async () => {
        try {
            const deviceInfo = await getExpoDeviceInfo();
            const newTracker = new ExpoAccessTracker('https://your-backend.vercel.app');
            await newTracker.initializeDevice(deviceInfo);
            setTracker(newTracker);
        } catch (error) {
            logger.error('Failed to initialize tracker:', error);
        }
    };

    const login = async (email: string, password: string) => {
        if (!tracker) throw new Error('Tracker not initialized');

        try {
            const result = await tracker.login(email, password);
            setIsAuthenticated(true);
            return result;
        } catch (error) {
            logger.error('Login failed:', error);
            throw error;
        }
    };

    const trackScreenView = async (screenName: string) => {
        if (!tracker) return;

        try {
            await tracker.trackAccess(\`/screens/\${screenName}\`, 'VIEW');
        } catch (error) {
            logger.error('Failed to track screen view:', error);
        }
    };

    return {
        tracker,
        isAuthenticated,
        login,
        trackScreenView,
    };
}
`;

/**
 * React Native におけるナビゲーション追跡の例
 */
export const navigationTrackingExample = `
// App.tsx - ナビゲーション追跡を設定する
import { NavigationContainer } from '@react-navigation/native';
import { useAccessTracker } from './hooks/useAccessTracker';

export default function App() {
    const { trackScreenView } = useAccessTracker();

    const onStateChange = (state) => {
        if (state) {
            const currentRoute = getCurrentRouteName(state);
            trackScreenView(currentRoute);
        }
    };

    return (
        <NavigationContainer onStateChange={onStateChange}>
            {/* アプリ側のナビゲーション構成をここに記述 */}
        </NavigationContainer>
    );
}

function getCurrentRouteName(state) {
    const route = state.routes[state.index];

    if (route.state) {
        return getCurrentRouteName(route.state);
    }

    return route.name;
}
`;

/**
 * 認証統合の実装例
 */
export const authenticationExample = `
// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExpoAccessTracker } from '../lib/access-tracker';
import { logger } from "@/lib/logger";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [tracker, setTracker] = useState(null);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        const deviceInfo = await getExpoDeviceInfo();
        const newTracker = new ExpoAccessTracker('https://your-backend.vercel.app');
        await newTracker.initializeDevice(deviceInfo);
        setTracker(newTracker);

        // 既存のセッションが存在するか確認する
        const storedToken = await AsyncStorage.getItem('auth-token');
        if (storedToken) {
            try {
                newTracker.authToken = storedToken;
                const currentUser = await newTracker.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                // トークンが無効なら削除する
                await AsyncStorage.removeItem('auth-token');
            }
        }
    };

    const login = async (email, password) => {
        if (!tracker) throw new Error('App not initialized');

        const result = await tracker.login(email, password);
        await AsyncStorage.setItem('auth-token', result.token);
        setUser(result.user);
        return result;
    };

    const logout = async () => {
        await AsyncStorage.removeItem('auth-token');
        setUser(null);
        if (tracker) {
            tracker.authToken = undefined;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            tracker,
            login,
            logout,
            isAuthenticated: !!user,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
`;

export default ExpoAccessTracker;

// EOF
