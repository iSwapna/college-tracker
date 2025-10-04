import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions for common operations
export async function getUserApplicationsWithProgress(userId: string) {
	console.log('🔎 getUserApplicationsWithProgress called for userId:', userId);

	const result = await prisma.application.findMany({
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

	console.log('📦 getUserApplicationsWithProgress result:', result.length, 'applications');
	result.forEach(app => {
		console.log(`  - ${app.schoolName}: ${app.tasks.length} tasks`);
		app.tasks.forEach(t => console.log(`    • ${t.title} [${t.taskType?.type}] - ${t.timeEstimate}h`));
	});

	return result;
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
	console.log('🔍 calculateWeeklyPlan called for userId:', userId);

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

	console.log('📚 Applications found:', applications.length);
	console.log('📝 Applications with tasks:', applications.map(app => ({
		school: app.schoolName,
		deadline: app.deadline,
		taskCount: app.tasks.length,
		tasks: app.tasks.map(t => ({ title: t.title, type: t.taskType?.type, hours: t.timeEstimate, status: t.status }))
	})));

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

	const totalWorkTime = allUserTasksForTime
		.filter(task => task.timeEstimate && task.timeEstimate > 0)
		.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
	const bufferedWorkTime = totalWorkTime * 1.1;

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
		totalWorkTime, // Total work time across all tasks (completed + pending)
		totalNotifications: notificationTasks.length,
		overallProgress,
		currentWeekTasks
	};
}

// Helper: Calculate weeks until a deadline (with 2-day buffer before deadline)
function calculateWeeksUntilDeadline(deadline: Date, referenceDate: Date = new Date()): number {
	const deadlineWithBuffer = new Date(deadline);
	deadlineWithBuffer.setDate(deadlineWithBuffer.getDate() - 2); // 2-day buffer

	const weeksUntil = Math.max(
		1,
		Math.ceil((deadlineWithBuffer.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
	);

	return weeksUntil;
}

// Helper: Calculate total time for remaining tasks (from index onwards)
function calculateRemainingTime(taskList: any[], startIndex: number): number {
	return taskList
		.slice(startIndex)
		.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
}

// Helper: Calculate current week's total hours
function calculateWeekHours(weekTasks: any[]): number {
	return weekTasks.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);
}

// Helper: Create week object for calendar display
function createWeekObject(weekNumber: number, weekTasks: any[], referenceDate: Date) {
	const weekStart = new Date(referenceDate);
	weekStart.setDate(weekStart.getDate() + ((weekNumber - 1) * 7));
	weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 6);

	return {
		weekNumber,
		startDate: weekStart,
		endDate: weekEnd,
		tasks: weekTasks,
		totalHours: calculateWeekHours(weekTasks)
	};
}

// Helper function to distribute work across weeks using sequential filling algorithm
function createWeeklyDistribution(applications: any[], totalBufferedTime: number) {
	const now = new Date();

	// Find latest deadline to determine total weeks available
	const latestDeadline = applications
		.map(app => new Date(app.deadline))
		.sort((a, b) => b.getTime() - a.getTime())[0];

	if (!latestDeadline) return [];

	const maxWeeks = calculateWeeksUntilDeadline(latestDeadline, now);

	// Build task list: all work tasks sorted by application deadline (earliest first)
	const taskList = applications
		.flatMap(app =>
			app.tasks
				.filter((task: any) => task.timeEstimate && task.timeEstimate > 0)
				.map((task: any) => ({
					...task,
					applicationDeadline: app.deadline,
					schoolName: app.schoolName,
					schoolId: app.id,
					deadlineWeek: calculateWeeksUntilDeadline(app.deadline, now)
				}))
		)
		.sort((a, b) => new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime());

	console.log('📅 Tasks to schedule:', taskList.length);
	console.log('📋 Task details:', taskList.map(t => ({ title: t.title, hours: t.timeEstimate, deadlineWeek: t.deadlineWeek })));

	if (taskList.length === 0) return [];

	// SEQUENTIAL FILLING ALGORITHM (from TODO.md)
	// 1. Calculate initial average weekly capacity: avg = (total hours * 1.1) / last deadline
	let avgWeeklyCapacity = totalBufferedTime / maxWeeks;

	// 2. Initialize scheduling state
	const weeklyTasks: { [week: number]: any[] } = {};
	let currWeek = 1;
	let taskIndex = 0;

	// 3. Sequential scheduling loop
	while (taskIndex < taskList.length) {
		const currentTask = taskList[taskIndex];

		// Initialize current week if needed
		if (!weeklyTasks[currWeek]) {
			weeklyTasks[currWeek] = [];
		}

		const currentWeekHours = calculateWeekHours(weeklyTasks[currWeek]);

		// CASE 1: Task deadline is this week or past - MUST schedule immediately
		if (currentTask.deadlineWeek <= currWeek) {
			weeklyTasks[currWeek].push(currentTask);
			taskIndex++;

			// Recalculate average for remaining tasks
			const remainingTime = calculateRemainingTime(taskList, taskIndex);
			const remainingWeeks = Math.max(1, maxWeeks - currWeek);
			avgWeeklyCapacity = (remainingTime * 1.1) / remainingWeeks;
		}
		// CASE 2: Task fits within current week's average capacity
		else if (currentWeekHours + currentTask.timeEstimate < avgWeeklyCapacity) {
			weeklyTasks[currWeek].push(currentTask);
			taskIndex++;
		}
		// CASE 3: Current week is full - move to next week
		else {
			currWeek++;
		}
	}

	// Convert weeklyTasks map to week objects for display
	const weeks = [];
	for (let i = 1; i <= maxWeeks; i++) {
		const tasks = weeklyTasks[i] || [];
		weeks.push(createWeekObject(i, tasks, now));
	}

	console.log('📆 Weekly distribution:', weeks.map(w => ({ week: w.weekNumber, tasks: w.tasks.length, hours: w.totalHours })));

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

export async function getApplicationWithTasks(applicationId: string, userId: string) {
	console.log('🔎 getApplicationWithTasks called:', { applicationId, userId });

	const result = await prisma.application.findFirst({
		where: {
			id: applicationId,
			userId: userId // Only return if user owns it
		},
		include: {
			tasks: {
				include: {
					taskType: true
				},
				orderBy: [
					{ order: 'asc' },
					{ globalOrder: 'asc' }
				]
			},
			user: true
		}
	});

	if (result) {
		console.log('📦 getApplicationWithTasks result:', {
			school: result.schoolName,
			taskCount: result.tasks.length,
			tasks: result.tasks.map(t => ({
				title: t.title,
				type: t.taskType?.type,
				hours: t.timeEstimate,
				typeId: t.taskTypeId
			}))
		});
	} else {
		console.log('❌ getApplicationWithTasks: No application found');
	}

	return result;
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
				create: data.tasks.map(task => ({
					...task,
					url: data.url // inherit application URL by default
				}))
			} : undefined
		},
		include: {
			tasks: true
		}
	});
}

export async function deleteApplication(applicationId: string, userId: string) {
	// Only delete if user owns it
	return await prisma.application.deleteMany({
		where: {
			id: applicationId,
			userId: userId
		}
	});
}

