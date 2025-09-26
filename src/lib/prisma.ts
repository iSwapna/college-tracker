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
			tasks: true
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

export async function getApplicationWithTasks(applicationId: string) {
	return await prisma.application.findUnique({
		where: { id: applicationId },
		include: {
			tasks: {
				orderBy: [
					{ globalOrder: 'asc' },
					{ createdAt: 'asc' }
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
			completedAt: status === 'completed' ? new Date() : null,
			updatedAt: new Date()
		}
	});
}

export async function createApplication(data: {
	userId: string;
	schoolName: string;
	deadline: Date;
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
			tasks: data.tasks ? {
				create: data.tasks
			} : undefined
		},
		include: {
			tasks: true
		}
	});
}