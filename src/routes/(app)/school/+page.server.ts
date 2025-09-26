import { getUserApplicationsWithProgress, createApplication } from '$lib/prisma';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	// Using demo user for now - in real app this would come from session
	const demoUserId = 'cmfyzo7xh0004zufl08jtcc5i'; // From your seed data

	try {
		// For now, return empty schools array since we removed the Program model
		// In a real app, you might want to maintain a list of schools separately
		const allSchools: Array<{name: string, program_id: string}> = [];

		// Get user's saved applications with task data
		const applications = await getUserApplicationsWithProgress(demoUserId);
		
		// Transform applications to match SavedApplication interface
		const savedApplications = applications.map(app => ({
			id: app.id,
			school_name: app.schoolName,
			program_id: '',
			status: app.status,
			created_at: app.createdAt.toISOString(),
			deadline: app.deadline.toISOString(),
			tasks: app.tasks.map(task => ({
				title: task.title,
				status: task.status === 'completed',
				time_estimate: task.timeEstimate || 0
			}))
		}));

		return {
			allSchools,
			savedApplications,
			initialSelectedSchools: [] // Empty since we're loading from localStorage on client
		};

	} catch (error) {
		console.error('Error loading school data:', error);
		return {
			allSchools: [],
			savedApplications: [],
			initialSelectedSchools: []
		};
	}
};

export const actions = {
	addSchool: async ({ request }) => {
		const formData = await request.formData();
		const schoolName = formData.get('schoolName') as string;
		const deadline = formData.get('deadline') as string;
		
		if (!schoolName?.trim()) {
			return fail(400, { error: 'School name is required' });
		}

		try {
			// Using demo user for now - in real app this would come from session
			const demoUserId = 'cmfyzo7xh0004zufl08jtcc5i';
			
			// Check if school already exists for this user
			const existingApplications = await getUserApplicationsWithProgress(demoUserId);
			const duplicate = existingApplications.find(app => 
				app.schoolName.toLowerCase() === schoolName.trim().toLowerCase()
			);
			
			if (duplicate) {
				return fail(400, { error: 'School already exists in your applications' });
			}
			
			const application = await createApplication({
				userId: demoUserId,
				schoolName: schoolName.trim(),
				deadline: deadline ? new Date(deadline) : new Date()
			});

			return { success: true, application };
		} catch (error) {
			console.error('Error creating application:', error);
			return fail(500, { error: 'Failed to create application' });
		}
	}
};