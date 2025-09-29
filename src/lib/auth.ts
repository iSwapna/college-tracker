import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from './prisma';

export async function getUser(event: RequestEvent) {
	const session = event.cookies.get('session');
	
	if (!session) {
		return null;
	}

	// Handle demo user
	if (session === 'demo-user-session') {
		return {
			id: 'cmfyzo7xh0004zufl08jtcc5i', // Demo user ID from seed
			email: 'demo@example.com',
			name: 'Demo User'
		};
	}

	// Handle real users
	try {
		const user = await prisma.user.findUnique({
			where: { id: session }
		});
		return user;
	} catch (error) {
		console.error('Error fetching user:', error);
		return null;
	}
}

export function logout(event: RequestEvent) {
	event.cookies.delete('session', { path: '/' });
}