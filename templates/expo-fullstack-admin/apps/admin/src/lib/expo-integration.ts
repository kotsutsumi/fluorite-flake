/**
 * Expo App Integration Utilities for Access Tracking
 *
 * This file provides utility functions and examples for integrating
 * Expo mobile apps with the access tracking system.
 */

export interface ExpoDeviceInfo {
    deviceId: string;
    platform: 'ios' | 'android';
    osVersion?: string;
    appVersion?: string;
    deviceModel?: string;
    deviceName?: string;
    pushToken?: string;
    timezone?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
}

export interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    createdAt?: string;
}

export interface Device {
    id: string;
    deviceId: string;
    platform: string;
    deviceModel?: string;
    appVersion?: string;
    lastSeenAt?: string;
    isActive?: boolean;
}

export interface LoginResponse {
    token: string;
    user: User;
    expiresAt: string;
}

export interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{
        message: string;
        extensions?: {
            code?: string;
        };
    }>;
}

export class ExpoAccessTracker {
    private baseUrl: string;
    private authToken?: string;
    private deviceInfo?: ExpoDeviceInfo;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Initialize device tracking with Expo device information
     */
    async initializeDevice(deviceInfo: ExpoDeviceInfo): Promise<void> {
        this.deviceInfo = deviceInfo;

        // Register or update device information
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
     * Authenticate user and get access token
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

        const response = await this.makeGraphQLRequest<{ login: LoginResponse }>(
            mutation,
            variables
        );

        if (response.data?.login) {
            this.authToken = response.data.login.token;
            return response.data.login;
        }

        throw new Error('Login failed');
    }

    /**
     * Track app access/navigation
     */
    async trackAccess(
        path: string,
        method: string = 'GET',
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
     * Update push notification token
     */
    async updatePushToken(pushToken: string): Promise<void> {
        if (!this.deviceInfo?.deviceId) {
            throw new Error('Device not initialized');
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
     * Get current user information
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
     * Get user's devices
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
     * Make GraphQL request
     */
    private async makeGraphQLRequest<T = unknown>(
        query: string,
        variables?: Record<string, unknown>
    ): Promise<GraphQLResponse<T>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.deviceInfo?.deviceId) {
            headers['x-device-id'] = this.deviceInfo.deviceId;
        }

        if (this.authToken) {
            headers.Authorization = `Bearer ${this.authToken}`;
        }

        const response = await fetch(`${this.baseUrl}/api/graphql`, {
            method: 'POST',
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
 * Expo-specific device information collection
 *
 * Example usage in Expo app:
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
// Install required Expo packages first:
// npx expo install expo-device expo-application expo-localization expo-notifications

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function getExpoDeviceInfo(): Promise<ExpoDeviceInfo> {
    // Generate or retrieve persistent device ID
    let deviceId = await AsyncStorage.getItem('device-id');
    if (!deviceId) {
        deviceId = await Application.getInstallationIdAsync();
        await AsyncStorage.setItem('device-id', deviceId);
    }

    // Get push notification token
    let pushToken;
    try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
            const token = await Notifications.getExpoPushTokenAsync();
            pushToken = token.data;
        }
    } catch (error) {
        console.log('Error getting push token:', error);
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

// Usage in React Native component
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
            console.error('Failed to initialize tracker:', error);
        }
    };

    const login = async (email: string, password: string) => {
        if (!tracker) throw new Error('Tracker not initialized');

        try {
            const result = await tracker.login(email, password);
            setIsAuthenticated(true);
            return result;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const trackScreenView = async (screenName: string) => {
        if (!tracker) return;

        try {
            await tracker.trackAccess(\`/screens/\${screenName}\`, 'VIEW');
        } catch (error) {
            console.error('Failed to track screen view:', error);
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
 * Example React Native navigation tracking
 */
export const navigationTrackingExample = `
// App.tsx - Set up navigation tracking
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
            {/* Your navigation setup */}
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
 * Example authentication integration
 */
export const authenticationExample = `
// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExpoAccessTracker } from '../lib/access-tracker';

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

        // Check for existing session
        const storedToken = await AsyncStorage.getItem('auth-token');
        if (storedToken) {
            try {
                newTracker.authToken = storedToken;
                const currentUser = await newTracker.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                // Token invalid, clear it
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
