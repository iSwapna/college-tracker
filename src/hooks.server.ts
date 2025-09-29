import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { getUser } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// Get user from session
	const user = await getUser(event);
	
	// Add user to locals for access in routes
	event.locals.user = user;

	// Protect app routes (anything under /(app)/)
	if (event.url.pathname.startsWith('/school') || 
		event.url.pathname.startsWith('/plan') ||
		event.url.pathname.includes('/(app)/')) {
		
		if (!user) {
			throw redirect(302, '/login');
		}
	}

	// Redirect to landing page if logged in and visiting login
	if (user && event.url.pathname === '/login') {
		throw redirect(302, '/');
	}

	return resolve(event);
};