import { type NextRequest, NextResponse } from 'next/server';
import { APP_ROLES } from '@/lib/roles';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        if (process.env.NODE_ENV !== 'development') {
            return NextResponse.json(
                { message: 'Test setup only available in development' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'setup') {
            const testUsers = [
                {
                    email: 'admin@test.com',
                    password: 'password123',
                    name: 'Test Admin',
                    role: APP_ROLES.ADMIN,
                },
                {
                    email: 'guest@test.com',
                    password: 'password123',
                    name: 'Test Guest',
                    role: APP_ROLES.USER,
                },
                {
                    email: 'member@test.com',
                    password: 'password123',
                    name: 'Test Member',
                    role: APP_ROLES._MEMBER,
                    MemberId: 'TEST-001',
                    memberSince: new Date(),
                },
            ];

            const createdUsers: Array<{ email: string; role: string; password: string }> = [];

            for (const userData of testUsers) {
                const existingUser = await prisma.user.findUnique({
                    where: { email: userData.email },
                });

                if (!existingUser) {
                    const hashedPassword = await bcrypt.hash(userData.password, 12);

                    const user = await prisma.user.create({
                        data: {
                            email: userData.email,
                            name: userData.name,
                            role: userData.role,
                            MemberId: userData.MemberId,
                            memberSince: userData.memberSince,
                            emailVerified: true,
                            isActive: true,
                        },
                    });

                    await prisma.account.create({
                        data: {
                            userId: user.id,
                            accountId: user.email,
                            providerId: 'credential',
                            password: hashedPassword,
                        },
                    });

                    createdUsers.push({
                        email: userData.email,
                        role: userData.role,
                        password: userData.password,
                    });
                }
            }

            return NextResponse.json({
                message: 'Test data setup completed',
                testUsers: createdUsers,
                instructions: {
                    frontend: 'Use the test accounts to login in the app',
                    admin: 'Visit /admin and login with admin@test.com',
                },
            });
        }

        if (action === 'cleanup') {
            const testEmails = ['admin@test.com', 'guest@test.com', 'member@test.com'];

            await prisma.account.deleteMany({
                where: {
                    user: {
                        email: {
                            in: testEmails,
                        },
                    },
                },
            });

            await prisma.user.deleteMany({
                where: {
                    email: {
                        in: testEmails,
                    },
                },
            });

            return NextResponse.json({
                message: 'Test data cleaned up successfully',
            });
        }

        return NextResponse.json(
            { message: 'Invalid action. Use "setup" or "cleanup"' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Test setup error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// EOF
