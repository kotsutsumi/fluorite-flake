export function getDeploymentText(framework: string): string {
    switch (framework) {
        case 'nextjs':
            return 'Vercel';
        case 'tauri':
            return 'GitHub Releases';
        case 'flutter':
            return 'Store Distribution';
        case 'expo':
            return 'EAS Build';
        default:
            return 'Custom';
    }
}
