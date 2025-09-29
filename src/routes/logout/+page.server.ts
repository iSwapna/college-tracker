import { redirect } from '@sveltejs/kit';
import { logout } from '$lib/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		logout(event);
		throw redirect(302, '/login');
	}
};