import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		// Demo authentication - check against demo user or database
		if (email === 'demo@example.com' && password === 'password') {
			// Set session cookie
			cookies.set('session', 'demo-user-session', {
				path: '/',
				httpOnly: true,
				secure: false, // Set to true in production
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7 // 7 days
			});
			
			throw redirect(302, '/school');
		}

		// Check database for real users
		try {
			const user = await prisma.user.findUnique({
				where: { email }
			});

			if (!user) {
				return fail(400, { error: 'Invalid email or password' });
			}

			// In a real app, you'd verify the password hash here
			// For now, just accept any password for existing users
			
			// Set session cookie with user ID
			cookies.set('session', user.id, {
				path: '/',
				httpOnly: true,
				secure: false, // Set to true in production
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7 // 7 days
			});

			throw redirect(302, '/school');
		} catch (error) {
			console.error('Login error:', error);
			return fail(500, { error: 'Login failed' });
		}
	}
};