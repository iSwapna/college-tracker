import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions for common operations
export async function getUserApplicationsWithProgress(userId: string) {
	return await prisma.application.findMany({
		where: { userId },
		include: {
			tasks: {
				include: {
					taskType: true
				},
				orderBy: [
					{ order: 'asc' },
					{ globalOrder: 'asc' }
				]
			}
		},
		orderBy: { deadline: 'asc' }
	});
}

export async function calculateUserTimeNeeded(userId: string) {
	const applications = await prisma.application.findMany({
		where: { userId },
		include: {
			tasks: {
				where: {
					status: { not: 'completed' }
				}
			}
		}
	});

	const totalTime = applications.reduce(
		(total, app) => 
			total + app.tasks.reduce((sum, task) => sum + (task.timeEstimate || 0), 0),
		0
	);

	const remainingTasks = applications.reduce(
		(total, app) => total + app.tasks.length,
		0
	);

	// Find earliest deadline
	const earliestDeadline = applications
		.map(app => app.deadline)
		.sort((a, b) => a.getTime() - b.getTime())[0];

	if (!earliestDeadline || totalTime === 0) {
		return { 
			totalTime: 0, 
			weeklyTime: 0, 
			weeklyTimeWithBuffer: 0, 
			remainingTasks: 0,
			weeksUntilDeadline: 0
		};
	}

	const weeksUntilDeadline = Math.max(
		1, 
		Math.ceil((earliestDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
	);
	
	const weeklyTime = Math.ceil(totalTime / weeksUntilDeadline);
	const weeklyTimeWithBuffer = Math.ceil(weeklyTime * 1.3);

	return {
		totalTime,
		weeklyTime,
		weeklyTimeWithBuffer,
		remainingTasks,
		weeksUntilDeadline
	};
}

// Calculate weekly work plan with dynamic distribution
export async function calculateWeeklyPlan(userId: string) {
	const applications = await prisma.application.findMany({
		where: { userId },
		include: {
			tasks: {
				where: { status: { not: 'completed' } },
				include: { taskType: true },
				orderBy: [{ order: 'asc' }, { globalOrder: 'asc' }]
			}
		},
		orderBy: { deadline: 'asc' }
	});

	if (applications.length === 0) {
		return {
			weeklyPlan: [],
			totalWorkTime: 0,
			totalNotifications: 0,
			overallProgress: { essays: 0, notifications: 0 },
			currentWeekTasks: []
		};
	}

	// Calculate total work time from ALL tasks with time estimates (completed + pending)
	const allUserTasksForTime = await prisma.task.findMany({
		where: { 
			application: { userId },
		},
		include: { taskType: true }
	});
	
	const actualWorkTime = allUserTasksForTime
		.filter(task => task.timeEstimate && task.timeEstimate > 0)
		.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
	const bufferedWorkTime = actualWorkTime * 1.1;

	// Get notification tasks (but we won't include them in the calendar)
	const notificationTasks = applications.flatMap(app => 
		app.tasks.filter(task => task.taskType?.type === 'notification')
	);

	// Calculate overall progress
	const allUserTasks = await prisma.task.findMany({
		where: { 
			application: { userId },
		},
		include: { taskType: true }
	});

	const essayTasks = allUserTasks.filter(task => 
		['essay-draft', 'essay-final'].includes(task.taskType?.type || '')
	);
	const completedEssayTasks = essayTasks.filter(task => task.status === 'completed');
	const completedNotificationTasks = allUserTasks
		.filter(task => task.taskType?.type === 'notification')
		.filter(task => task.status === 'completed');

	// Calculate essay hours
	const essayHoursCompleted = completedEssayTasks.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
	const essayHoursTotal = essayTasks.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
	
	const overallProgress = {
		essays: essayTasks.length > 0 ? Math.round((completedEssayTasks.length / essayTasks.length) * 100) : 0,
		notifications: notificationTasks.length > 0 ? Math.round((completedNotificationTasks.length / allUserTasks.filter(t => t.taskType?.type === 'notification').length) * 100) : 0,
		essayHours: {
			completed: essayHoursCompleted,
			total: essayHoursTotal,
			percentage: essayHoursTotal > 0 ? Math.round((essayHoursCompleted / essayHoursTotal) * 100) : 0
		}
	};

	// Create weekly distribution (only work tasks with time estimates)
	const weeklyPlan = createWeeklyDistribution(applications, bufferedWorkTime);
	
	// Get current week tasks
	const currentWeekTasks = getCurrentWeekTasks(weeklyPlan);

	return {
		weeklyPlan,
		actualWorkTime, // Show user the actual pending time
		totalWorkTime: bufferedWorkTime, // Keep for backward compatibility  
		totalNotifications: notificationTasks.length,
		overallProgress,
		currentWeekTasks
	};
}

// Helper function to distribute work across weeks
function createWeeklyDistribution(applications: any[], totalBufferedTime: number) {
	const weeks = [];
	const now = new Date();
	
	// Find earliest deadline and calculate weeks needed
	const earliestDeadline = applications
		.map(app => new Date(app.deadline))
		.sort((a, b) => a.getTime() - b.getTime())[0];
	
	if (!earliestDeadline) return [];

	// Calculate weeks until earliest deadline minus 2-day buffer
	const bufferDate = new Date(earliestDeadline);
	bufferDate.setDate(bufferDate.getDate() - 2);
	
	const weeksAvailable = Math.max(1, 
		Math.ceil((bufferDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7))
	);

	// Get all work tasks (non-zero time) sorted by deadline priority
	const workTasks = applications.flatMap(app => 
		app.tasks
			.filter((task: any) => task.timeEstimate && task.timeEstimate > 0)
			.map((task: any) => ({
				...task,
				applicationDeadline: app.deadline,
				schoolName: app.schoolName
			}))
	).sort((a, b) => new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime());

	// Calculate target hours per week
	const targetHoursPerWeek = Math.ceil(totalBufferedTime / weeksAvailable);

	// Distribute work tasks across weeks
	let currentWeekIndex = 0;
	let currentWeekHours = 0;
	
	for (let i = 0; i < weeksAvailable; i++) {
		const weekStart = new Date(now);
		weekStart.setDate(weekStart.getDate() + (i * 7));
		weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
		
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 6);

		weeks.push({
			weekNumber: i + 1,
			startDate: weekStart,
			endDate: weekEnd,
			tasks: [],
			totalHours: 0
		});
	}

	// Distribute work tasks
	for (const task of workTasks) {
		if (currentWeekIndex < weeks.length) {
			const week = weeks[currentWeekIndex];
			week.tasks.push(task);
			week.totalHours += task.timeEstimate || 0;
			currentWeekHours += task.timeEstimate || 0;

			// Move to next week if we've hit our target hours
			if (currentWeekHours >= targetHoursPerWeek && currentWeekIndex < weeks.length - 1) {
				currentWeekIndex++;
				currentWeekHours = 0;
			}
		}
	}

	return weeks;
}

// Get current week tasks
function getCurrentWeekTasks(weeklyPlan: any[]) {
	const now = new Date();
	const startOfWeek = new Date(now);
	startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
	startOfWeek.setHours(0, 0, 0, 0);
	
	const endOfWeek = new Date(startOfWeek);
	endOfWeek.setDate(endOfWeek.getDate() + 6);
	endOfWeek.setHours(23, 59, 59, 999);

	const currentWeek = weeklyPlan.find(week => 
		week.startDate <= endOfWeek && week.endDate >= startOfWeek
	);

	if (!currentWeek) return [];

	return currentWeek.tasks.map((task: any) => ({ ...task, type: 'work' }));
}

export async function getApplicationWithTasks(applicationId: string) {
	return await prisma.application.findUnique({
		where: { id: applicationId },
		include: {
			tasks: {
				orderBy: [
					{ order: 'asc' },
					{ globalOrder: 'asc' }
				]
			},
			user: true
		}
	});
}

export async function updateTaskStatus(taskId: string, status: string) {
	return await prisma.task.update({
		where: { id: taskId },
		data: {
			status,
			completedAt: status === 'completed' ? new Date() : null
		}
	});
}

export async function createApplication(data: {
	userId: string;
	schoolName: string;
	deadline: Date;
	url?: string;
	tasks?: Array<{
		title: string;
		description?: string;
		taskTypeId: string;
		timeEstimate?: number;
		globalOrder?: number;
	}>;
}) {
	return await prisma.application.create({
		data: {
			userId: data.userId,
			schoolName: data.schoolName,
			deadline: data.deadline,
			url: data.url,
			tasks: data.tasks ? {
				create: data.tasks
			} : undefined
		},
		include: {
			tasks: true
		}
	});
}

export async function deleteApplication(applicationId: string) {
	return await prisma.application.delete({
		where: { id: applicationId }
	});
}

