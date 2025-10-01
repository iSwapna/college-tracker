import { redirect } from '@sveltejs/kit';
import { sessionHooks, type Handler, kindeAuthClient, type SessionManager } from '@kinde-oss/kinde-auth-sveltekit';
import { prisma } from '$lib/prisma';

export const handle: Handler = async ({ event, resolve }) => {
	sessionHooks({ event });

	const isAuthenticated = await kindeAuthClient.isAuthenticated(
		event.request as unknown as SessionManager
	);

	// Sync Kinde user to local database
	if (isAuthenticated) {
		const kindeUser = await kindeAuthClient.getUser(event.request as unknown as SessionManager);

		if (kindeUser) {
			// Check if user exists in our database
			let user = await prisma.user.findUnique({
				where: { kindeId: kindeUser.id }
			});

			// Create user if doesn't exist
			if (!user) {
				user = await prisma.user.create({
					data: {
						kindeId: kindeUser.id,
						email: kindeUser.email || '',
						username: kindeUser.username || kindeUser.email || 'user',
						name: kindeUser.given_name && kindeUser.family_name
							? `${kindeUser.given_name} ${kindeUser.family_name}`
							: kindeUser.given_name || kindeUser.family_name || null
					}
				});
			}

			// Add user to locals
			event.locals.user = user;
		}
	}

	// Protect app routes
	if (
		event.url.pathname.startsWith('/school') ||
		event.url.pathname.startsWith('/plan') ||
		event.url.pathname.includes('/(app)/')
	) {
		if (!isAuthenticated) {
			throw redirect(302, '/api/auth/login');
		}
	}

	// Redirect to school if logged in and visiting login
	if (isAuthenticated && event.url.pathname === '/login') {
		throw redirect(302, '/school');
	}

	const response = await resolve(event);

	// Prevent caching of authenticated pages
	if (
		event.url.pathname.startsWith('/school') ||
		event.url.pathname.startsWith('/plan') ||
		event.url.pathname === '/' ||
		event.url.pathname.includes('/(app)/')
	) {
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}

	return response;
};