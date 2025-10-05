import { type NextRequest, NextResponse } from 'next/server';
import { APP_ROLES } from '@/lib/roles';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        // Only allow in development
        if (process.env.NODE_ENV !== 'development') {
            return NextResponse.json(
                { message: 'Test setup only available in development' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'setup') {
            // Create test users for different roles
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
                    name: 'Test  Member',
                    role: APP_ROLES._MEMBER,
                    MemberId: '-TEST-001',
                    memberSince: new Date(),
                },
                {
                    email: 'sponsor@test.com',
                    password: 'password123',
                    name: 'Test  Sponsor',
                    role: APP_ROLES._SPONSOR,
                    sponsorInfo: JSON.stringify({
                        company: 'Test Sponsor Company',
                        contactPerson: 'Test Contact',
                        contractType: 'Premium',
                    }),
                },
            ];

            const createdUsers: Array<{ email: string; role: string; password: string }> = [];

            for (const userData of testUsers) {
                // Check if user already exists
                const existingUser = await prisma.user.findUnique({
                    where: { email: userData.email },
                });

                if (!existingUser) {
                    // Hash password
                    const hashedPassword = await bcrypt.hash(userData.password, 12);

                    // Create user
                    const user = await prisma.user.create({
                        data: {
                            email: userData.email,
                            name: userData.name,
                            role: userData.role,
                            MemberId: userData.MemberId,
                            memberSince: userData.memberSince,
                            sponsorInfo: userData.sponsorInfo,
                            emailVerified: true,
                            isActive: true,
                        },
                    });

                    // Create credential account
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

            // Create test video content
            const MemberUser = await prisma.user.findUnique({
                where: { email: 'member@test.com' },
            });

            const sponsorUser = await prisma.user.findUnique({
                where: { email: 'sponsor@test.com' },
            });

            if (MemberUser) {
                await prisma.videoContent.createMany({
                    data: [
                        {
                            title: 'Test Member Video 1',
                            description: 'Test video by  member',
                            videoUrl: 'https://example.com/video1.mp4',
                            contentType: 'user_content',
                            isPublished: true,
                            publishedAt: new Date(),
                            authorId: MemberUser.id,
                        },
                        {
                            title: 'Test Member Video 2 (Draft)',
                            description: 'Draft video by  member',
                            videoUrl: 'https://example.com/video2.mp4',
                            contentType: 'user_content',
                            isPublished: false,
                            publishedAt: null,
                            authorId: MemberUser.id,
                        },
                    ],
                });
            }

            if (sponsorUser) {
                await Promise.all([
                    // Create commercial video content
                    prisma.videoContent.create({
                        data: {
                            title: 'Test Sponsor Commercial',
                            description: 'Commercial video by sponsor',
                            videoUrl: 'https://example.com/commercial1.mp4',
                            contentType: 'commercial',
                            isPublished: true,
                            publishedAt: new Date(),
                            authorId: sponsorUser.id,
                        },
                    }),

                    // Create test facility
                    prisma.facility.create({
                        data: {
                            name: 'Test Fishing Facility',
                            description: 'A test facility for sponsor content',
                            category: '釣り場',
                            address: '東京都テスト区テスト町1-1-1',
                            location: JSON.stringify({
                                lat: 35.6762,
                                lng: 139.6503,
                                address: '東京都テスト区テスト町1-1-1',
                            }),
                            contactInfo: JSON.stringify({
                                phone: '03-0000-0000',
                                email: 'facility@test.com',
                                website: 'https://test-facility.com',
                            }),
                            isPublished: true,
                            publishedAt: new Date(),
                            isFeatured: true,
                            ownerId: sponsorUser.id,
                        },
                    }),
                ]);
            }

            return NextResponse.json({
                message: 'Test data setup completed',
                testUsers: createdUsers,
                instructions: {
                    frontend: 'Use the test accounts to login in the mobile app',
                    admin: 'Visit /admin and login with admin@test.com',
                    testflows: 'Test all user roles and permissions',
                },
            });
        }

        if (action === 'cleanup') {
            // Clean up test data
            const testEmails = [
                'admin@test.com',
                'guest@test.com',
                'member@test.com',
                'sponsor@test.com',
            ];

            await Promise.all([
                prisma.videoContent.deleteMany({
                    where: {
                        author: {
                            email: {
                                in: testEmails,
                            },
                        },
                    },
                }),
                prisma.facility.deleteMany({
                    where: {
                        owner: {
                            email: {
                                in: testEmails,
                            },
                        },
                    },
                }),
                prisma.account.deleteMany({
                    where: {
                        user: {
                            email: {
                                in: testEmails,
                            },
                        },
                    },
                }),
                prisma.user.deleteMany({
                    where: {
                        email: {
                            in: testEmails,
                        },
                    },
                }),
            ]);

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
        return NextResponse.json(
            {
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
