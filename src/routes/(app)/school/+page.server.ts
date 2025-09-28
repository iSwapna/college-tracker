import { getUserApplicationsWithProgress, createApplication, deleteApplication } from '$lib/prisma';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	// Using demo user for now - in real app this would come from session
	const demoUserId = 'cmfyzo7xh0004zufl08jtcc5i'; // From your seed data

	try {
		// For now, return empty schools array since we removed the Program model
		// In a real app, you might want to maintain a list of schools separately
		const allSchools: Array<{name: string, program_id: string}> = [];

		// Get user's saved applications with task data
		const applications: any[] = await getUserApplicationsWithProgress(demoUserId);
		
		// Transform applications to match SavedApplication interface
		const savedApplications = applications.map(app => ({
			id: app.id,
			school_name: app.schoolName,
			program_id: '',
			status: app.status,
			deadline: app.deadline.toISOString(),
			tasks: (app.tasks || []).map((task: any) => ({
				title: task.title,
				description: task.description || undefined,
				status: task.status === 'completed',
				time_estimate: task.timeEstimate || 0,
				order: task.order || undefined
			}))
		}));

		return {
			allSchools,
			savedApplications
		};

	} catch (error) {
		console.error('Error loading school data:', error);
		return {
			allSchools: [],
			savedApplications: []
		};
	}
};

export const actions = {
	addSchool: async ({ request }) => {
		console.log('ADD SCHOOL ACTION TRIGGERED');
		const formData = await request.formData();
		const schoolName = formData.get('schoolName') as string;
		const deadline = formData.get('deadline') as string;
		const url = formData.get('url') as string;
		
		console.log('Form data:', { schoolName, deadline, url });
		
		if (!schoolName?.trim()) {
			console.log('School name validation failed');
			return fail(400, { error: 'School name is required' });
		}

		// Validate deadline is not in the past
		if (deadline) {
			const deadlineDate = new Date(deadline);
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Set to start of day for comparison
			
			if (deadlineDate < today) {
				return fail(400, { error: 'Application deadline cannot be in the past' });
			}
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
			
			console.log('Creating application with:', {
				userId: demoUserId,
				schoolName: schoolName.trim(),
				deadline: deadline ? new Date(deadline) : new Date(),
				url: url?.trim() || undefined
			});
			
			const application = await createApplication({
				userId: demoUserId,
				schoolName: schoolName.trim(),
				deadline: deadline ? new Date(deadline) : new Date(),
				url: url?.trim() || undefined
			});

			console.log('🎉 Application created successfully:', application.id);
			return { success: true, application };
		} catch (error) {
			console.error('Error creating application:', error);
			return fail(500, { error: 'Failed to create application' });
		}
	},

	deleteSchool: async ({ request }) => {
		const formData = await request.formData();
		const applicationId = formData.get('applicationId') as string;
		
		if (!applicationId) {
			return fail(400, { error: 'Application ID is required' });
		}

		try {
			await deleteApplication(applicationId);
			return { success: true };
		} catch (error) {
			console.error('Error deleting application:', error);
			return fail(500, { error: 'Failed to delete application' });
		}
	}
};