import { getApplicationWithTasks, prisma } from '$lib/prisma';
import { fail } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const { applicationId } = params;
	
	if (!applicationId) {
		throw new Error('Application ID is required');
	}

	try {
		const application = await getApplicationWithTasks(applicationId);
		
		if (!application) {
			throw new Error('Application not found');
		}

		// Get all available task types
		const taskTypes = await prisma.taskType.findMany();

		return {
			application,
			taskTypes
		};
	} catch (error) {
		console.error('Error loading application:', error);
		throw error;
	}
};

export const actions: Actions = {
	addTask: async ({ request, params }) => {
		console.log('ADD TASK ACTION TRIGGERED');
		const { applicationId } = params;
		
		if (!applicationId) {
			return fail(400, { error: 'Application ID is required' });
		}
		const formData = await request.formData();
		console.log('Form data:', Object.fromEntries(formData));
		
		const title = formData.get('title') as string;
		const description = formData.get('description') as string || '';
		const timeEstimate = formData.get('timeEstimate') as string;
		const taskTypeId = formData.get('taskTypeId') as string;
		
		console.log('📝 Extracted data:', { title, taskTypeId, applicationId });
		
		if (!title?.trim()) {
			console.log('❌ Title validation failed');
			return fail(400, { error: 'Task title is required' });
		}

		if (!taskTypeId) {
			console.log('❌ TaskType validation failed');
			return fail(400, { error: 'Task type is required' });
		}

		try {
			console.log('🔍 Checking for duplicates...');
			// Check if task with same title already exists for this application
			const existingTask = await prisma.task.findFirst({
				where: {
					applicationId,
					title: title.trim()
				}
			});
			console.log('🔍 Query result:', existingTask);

			if (existingTask) {
				console.log('❌ DUPLICATE TASK FOUND:', existingTask.title);
				return fail(400, { error: 'A task with this title already exists' });
			}
			
			console.log('✅ No duplicate found, creating task...');

			// Get the task type to use its default time if none provided
			const taskType = await prisma.taskType.findUnique({
				where: { id: taskTypeId }
			});

			console.log('🔧 Task type:', taskType);
			console.log('🔧 Time estimate from form:', timeEstimate);

			const finalTimeEstimate = timeEstimate && timeEstimate.trim() 
				? parseInt(timeEstimate) 
				: taskType?.defaultTime;
			
			console.log('🔧 Final time estimate:', finalTimeEstimate);

			const task = await prisma.task.create({
				data: {
					applicationId,
					taskTypeId,
					title: title.trim(),
					description: description.trim(),
					timeEstimate: finalTimeEstimate,
					status: 'pending'
				}
			});

			return { success: true, task };
		} catch (error) {
			console.error('Error creating task:', error);
			return fail(500, { error: 'Failed to create task' });
		}
	},

	deleteTask: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;
		
		if (!taskId) {
			return fail(400, { error: 'Task ID is required' });
		}

		try {
			await prisma.task.delete({
				where: { id: taskId }
			});

			return { success: true };
		} catch (error) {
			console.error('Error deleting task:', error);
			return fail(500, { error: 'Failed to delete task' });
		}
	},

	updateTask: async ({ request }) => {
		const formData = await request.formData();
		const taskId = formData.get('taskId') as string;
		const status = formData.get('status') as string;
		const timeEstimate = formData.get('timeEstimate') as string;
		
		if (!taskId) {
			return fail(400, { error: 'Task ID is required' });
		}

		try {
			const updateData: any = {};
			
			if (status !== undefined) {
				updateData.status = status;
				updateData.completedAt = status === 'completed' ? new Date() : null;
			}
			
			if (timeEstimate !== undefined) {
				updateData.timeEstimate = timeEstimate ? parseInt(timeEstimate) : null;
			}

			const task = await prisma.task.update({
				where: { id: taskId },
				data: updateData
			});

			return { success: true, task };
		} catch (error) {
			console.error('Error updating task:', error);
			return fail(500, { error: 'Failed to update task' });
		}
	}
};