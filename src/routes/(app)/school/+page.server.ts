import { getUserApplicationsWithProgress } from '$lib/prisma';
import { prisma } from '$lib/prisma';

export const load = async () => {
	// Using demo user for now - in real app this would come from session
	const demoUserId = 'cmfyzo7xh0004zufl08jtcc5i'; // From your seed data

	try {
		// Get all programs (these are your "schools" to select from)
		const programs = await prisma.program.findMany({
			orderBy: { programName: 'asc' }
		});

		// Transform programs to match the SchoolOption interface
		const allSchools = programs.map(program => ({
			name: program.programName,
			program_id: program.id
		}));

		// Get user's saved applications with task data
		const applications = await getUserApplicationsWithProgress(demoUserId);
		
		// Transform applications to match SavedApplication interface
		const savedApplications = applications.map(app => ({
			id: app.id,
			school_name: app.schoolName,
			program_id: app.programId || '',
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