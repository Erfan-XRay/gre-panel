import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-key-change-me');

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // Auto-create admin if no users exist
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            if (username !== 'admin') {
                return NextResponse.json({ error: 'System not initialized. Login with admin to set up.' }, { status: 401 });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    passwordHash: hashedPassword,
                }
            });
            // Fall through to login
        }

        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Generate JWT
        const token = await new SignJWT({ userId: user.id, username: user.username })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('24h')
            .sign(JWT_SECRET);

        const response = NextResponse.json({ success: true, message: 'Logged in successfully' }, { status: 200 });

        // Set cookie
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && request.headers.get('x-forwarded-proto') === 'https',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/'
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
