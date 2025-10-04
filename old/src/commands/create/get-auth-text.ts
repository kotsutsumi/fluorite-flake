export function getAuthText(framework: string): string {
    switch (framework) {
        case 'nextjs':
            return 'Better Auth';
        case 'expo':
            return 'Expo Auth Session';
        default:
            return 'Custom Auth';
    }
}
