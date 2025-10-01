import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Ensure user is authenticated for all (app) routes
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Pass user to all child routes
	return {
		user: locals.user
	};
};
