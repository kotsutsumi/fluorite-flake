import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (sessionCookie?.value) {
            // Delete session from database
            await prisma.session.deleteMany({
                where: {
                    token: sessionCookie.value,
                },
            });
        }

        // Create response and clear cookie
        const response = NextResponse.json({ success: true });
        response.cookies.delete('session');

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            {
                error: { message: 'Logout failed' },
            },
            { status: 500 }
        );
    }
}
