/**
 * サービス状態表示機能
 *
 * 利用可能なサービスとその状態を表示します。
 *
 * @module showServiceStatus
 */

import chalk from 'chalk';
import { DefaultServiceFactory } from '../../services/service-factory/index.js';

/**
 * Show all available services and their status
 */
export async function showServiceStatus(): Promise<void> {
    console.log(chalk.bold.blue('\n🚀 Fluorite Flake - Available Services\n'));

    const serviceFactory = new DefaultServiceFactory();
    const allServices = serviceFactory.getAllServiceInfo();

    for (const [name, info] of Object.entries(allServices)) {
        console.log(chalk.cyan(`📦 ${info.displayName} (${name})`));
        console.log(chalk.gray(`   ${info.description}`));

        // 機能を表示
        const capabilities = Object.entries(info.capabilities)
            .filter(([, enabled]) => enabled)
            .map(([cap]) => cap);

        if (capabilities.length > 0) {
            console.log(
                chalk.green(
                    `   ✅ ${capabilities.slice(0, 3).join(', ')}${capabilities.length > 3 ? '...' : ''}`
                )
            );
        }

        console.log();
    }

    console.log(chalk.yellow('Usage:'));
    console.log(
        chalk.gray('  fluorite-flake dashboard <service>        # Single service dashboard')
    );
    console.log(
        chalk.gray('  fluorite-flake dashboard multi <services> # Multi-service dashboard')
    );
    console.log(
        chalk.gray('  fluorite-flake dashboard all              # All configured services')
    );
    console.log();
}
