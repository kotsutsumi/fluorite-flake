import { hashPassword } from 'better-auth/crypto';

import prisma from '../src/lib/db';
// Use the configured database client from lib/db.ts
// This properly handles LibSQL adapter for cloud environments
import { APP_ROLES } from '../src/lib/roles';

console.log('🌱 Starting database seeding...');

async function main() {
    // Clean up existing data (handle empty database gracefully)
    try {
        await prisma.post.deleteMany();
        await prisma.invitation.deleteMany();
        await prisma.member.deleteMany();
        await prisma.organization.deleteMany();
        await prisma.session.deleteMany();
        await prisma.account.deleteMany();
        await prisma.user.deleteMany();
    } catch (_error) {
        console.log('Database cleanup skipped (fresh database)');
    }

    // Create passwords for test users using Better Auth's hash function
    const adminPassword = await hashPassword('Admin123!');
    const orgAdminPassword = await hashPassword('OrgAdmin123!');
    const userPassword = await hashPassword('User123!');
    const demoPassword = await hashPassword('Demo123!');

    // Create base organization used across seeded data
    const bassAssociation = await prisma.organization.create({
        data: {
            name: 'テスト組織1',
            slug: 'test-organization-1',
            metadata: JSON.stringify({
                category: 'Bass Fishing',
                country: 'Japan',
            }),
        },
    });

    // Create admin user (full system access)
    const admin = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            name: '管理者ユーザー',
            emailVerified: true,
            role: APP_ROLES.ADMIN,
            accounts: {
                create: {
                    providerId: 'credential',
                    accountId: 'admin@example.com',
                    password: adminPassword,
                },
            },
            memberships: {
                create: {
                    organizationId: bassAssociation.id,
                    role: APP_ROLES.ADMIN,
                },
            },
        },
    });

    // Create org admin user (manages specific organizations)
    const orgAdmin = await prisma.user.create({
        data: {
            email: 'orgadmin@example.com',
            name: '組織管理者',
            emailVerified: true,
            role: APP_ROLES.ORG_ADMIN,
            accounts: {
                create: {
                    providerId: 'credential',
                    accountId: 'orgadmin@example.com',
                    password: orgAdminPassword,
                },
            },
            memberships: {
                create: {
                    organizationId: bassAssociation.id,
                    role: APP_ROLES.ORG_ADMIN,
                },
            },
        },
    });

    // Create regular user
    const user = await prisma.user.create({
        data: {
            email: 'user@example.com',
            name: '一般ユーザー',
            emailVerified: true,
            role: APP_ROLES.USER,
            accounts: {
                create: {
                    providerId: 'credential',
                    accountId: 'user@example.com',
                    password: userPassword,
                },
            },
            memberships: {
                create: {
                    organizationId: bassAssociation.id,
                    role: APP_ROLES.USER,
                },
            },
        },
    });

    // Create additional test users (for backward compatibility)
    const alice = await prisma.user.create({
        data: {
            email: 'alice@example.com',
            name: 'Alice Johnson',
            emailVerified: true,
            role: APP_ROLES.USER,
            accounts: {
                create: {
                    providerId: 'credential',
                    accountId: 'alice@example.com',
                    password: demoPassword,
                },
            },
            memberships: {
                create: {
                    organizationId: bassAssociation.id,
                    role: APP_ROLES.USER,
                },
            },
        },
    });

    const bob = await prisma.user.create({
        data: {
            email: 'bob@example.com',
            name: 'Bob Smith',
            emailVerified: true,
            role: APP_ROLES.USER,
            accounts: {
                create: {
                    providerId: 'credential',
                    accountId: 'bob@example.com',
                    password: demoPassword,
                },
            },
            memberships: {
                create: {
                    organizationId: bassAssociation.id,
                    role: APP_ROLES.ORG_ADMIN,
                },
            },
        },
    });

    const charlie = await prisma.user.create({
        data: {
            email: 'charlie@example.com',
            name: 'Charlie Brown',
            emailVerified: false,
            role: APP_ROLES.USER,
            accounts: {
                create: {
                    providerId: 'credential',
                    accountId: 'charlie@example.com',
                    password: demoPassword,
                },
            },
        },
    });

    // Create demo posts
    await prisma.post.createMany({
        data: [
            {
                title: 'Getting Started with Better Auth',
                content:
                    'Better Auth provides a comprehensive authentication solution with role-based access control, organizations, and more.',
                published: true,
                authorId: admin.id,
            },
            {
                title: 'Organization Management Best Practices',
                content:
                    'Learn how to effectively manage multiple organizations with role-based permissions.',
                published: true,
                authorId: orgAdmin.id,
            },
            {
                title: 'User Onboarding Guide',
                content: 'A step-by-step guide to onboarding new users to your platform.',
                published: true,
                authorId: user.id,
            },
            {
                title: 'Draft: Security Considerations',
                content: 'This post about security is still being written...',
                published: false,
                authorId: alice.id,
            },
            {
                title: 'Team Collaboration Features',
                content: 'Explore the collaboration features available within organizations.',
                published: true,
                authorId: bob.id,
            },
            {
                title: 'Testing Authentication Features',
                content: 'This post demonstrates the authentication and authorization features.',
                published: true,
                authorId: charlie.id,
            },
        ],
    });

    // Create pending invitations
    await prisma.invitation.createMany({
        data: [
            {
                email: 'pending@example.com',
                role: APP_ROLES.USER,
                status: 'pending',
                organizationId: bassAssociation.id,
                invitedBy: admin.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            },
            {
                email: 'another@example.com',
                role: APP_ROLES.ORG_ADMIN,
                status: 'pending',
                organizationId: bassAssociation.id,
                invitedBy: orgAdmin.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        ],
    });

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📊 Created:');
    console.log('   - 1 organization (テスト組織1)');
    console.log('   - 6 users with different roles');
    console.log('   - 6 posts (5 published, 1 draft)');
    console.log('   - 2 pending invitations');
    console.log('');
    console.log('🔐 Test Accounts:');
    console.log('   Admin:       admin@example.com / Admin123!');
    console.log('   Org Admin:   orgadmin@example.com / OrgAdmin123!');
    console.log('   User:        user@example.com / User123!');
    console.log('   Demo Users:  alice@example.com, bob@example.com / Demo123!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error('❌ Seeding failed:', error);
        await prisma.$disconnect();
        process.exit(1);
    });
