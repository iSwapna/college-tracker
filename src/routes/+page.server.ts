import { calculateWeeklyPlan, getUserApplicationsWithProgress, updateTaskStatus } from '$lib/prisma';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	// Using demo user for now - in real app this would come from session
	const demoUserId = 'cmg5kf74j0006yufqaz3fh50s';

	try {
		// Check if user has any applications
		const applications = await getUserApplicationsWithProgress(demoUserId);
		
		if (applications.length === 0) {
			return {
				hasApplications: false,
				weeklyPlan: null,
				currentWeekTasks: [],
				overallProgress: { essays: 0, notifications: 0 },
				actualWorkTime: 0,
				totalWorkTime: 0,
				allPendingTasks: []
			};
		}

		// Calculate the weekly plan
		const planData = await calculateWeeklyPlan(demoUserId);

		// Get all pending tasks in global order
		const allPendingTasks = await getUserApplicationsWithProgress(demoUserId);
		console.log('Raw applications:', allPendingTasks.length);
		
		const allTasks = allPendingTasks
			.flatMap((app: any) => (app.tasks || []).map((task: any) => ({
				...task,
				schoolName: app.schoolName,
				applicationDeadline: app.deadline
			})));
		
		console.log('All tasks:', allTasks.length);
		console.log('Task statuses:', allTasks.map(t => ({ title: t.title, status: t.status })));
		
		const pendingTasksInOrder = allTasks
			// Keep all tasks visible, regardless of completion status
			// .filter((task: any) => task.status !== 'completed')
			.sort((a: any, b: any) => {
				// Sort by school deadline first
				const deadlineA = new Date(a.applicationDeadline).getTime();
				const deadlineB = new Date(b.applicationDeadline).getTime();
				if (deadlineA !== deadlineB) {
					return deadlineA - deadlineB;
				}
				
				// Then by globalOrder within same deadline
				if (a.globalOrder !== null && b.globalOrder !== null) {
					return a.globalOrder - b.globalOrder;
				}
				if (a.globalOrder !== null) return -1;
				if (b.globalOrder !== null) return 1;
				
				// Then by regular order
				if (a.order !== null && b.order !== null) {
					return a.order - b.order;
				}
				return 0;
			});
			
		console.log('Pending tasks after filter:', pendingTasksInOrder.length);

		return {
			hasApplications: true,
			weeklyPlan: planData.weeklyPlan,
			currentWeekTasks: planData.currentWeekTasks,
			overallProgress: planData.overallProgress,
			actualWorkTime: planData.actualWorkTime,
			totalWorkTime: planData.totalWorkTime,
			totalNotifications: planData.totalNotifications,
			allPendingTasks: pendingTasksInOrder,
			allTasks: allTasks // Include all tasks for proper percentage calculations
		};

	} catch (error) {
		console.error('Error loading plan data:', error);
		return {
			hasApplications: false,
			weeklyPlan: null,
			currentWeekTasks: [],
			overallProgress: { essays: 0, notifications: 0 },
			actualWorkTime: 0,
			totalWorkTime: 0,
			allPendingTasks: []
		};
	}
};

export const actions = {
	completeTask: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;
		
		if (!taskId) {
			return fail(400, { error: 'Task ID is required' });
		}

		try {
			await updateTaskStatus(taskId, 'completed');
			return { success: true };
		} catch (error) {
			console.error('Error completing task:', error);
			return fail(500, { error: 'Failed to complete task' });
		}
	},
	
	uncompleteTask: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;
		
		if (!taskId) {
			return fail(400, { error: 'Task ID is required' });
		}

		try {
			await updateTaskStatus(taskId, 'pending');
			return { success: true };
		} catch (error) {
			console.error('Error uncompleting task:', error);
			return fail(500, { error: 'Failed to uncomplete task' });
		}
	}
};