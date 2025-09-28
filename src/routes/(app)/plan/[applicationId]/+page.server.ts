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

		// Debug: Log the loaded tasks to see timeEstimate values
		console.log('Loaded tasks from database:');
		(application as any).tasks?.forEach((task: any) => {
			console.log(`  Task: ${task.title}, timeEstimate: ${task.timeEstimate} (type: ${typeof task.timeEstimate})`);
		});

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
		const order = formData.get('order') as string;
		
		console.log('Extracted data:', { title, taskTypeId, applicationId });
		
		if (!title?.trim()) {
			console.log('Title validation failed');
			return fail(400, { error: 'Task title is required' });
		}

		if (!taskTypeId) {
			console.log('TaskType validation failed');
			return fail(400, { error: 'Task type is required' });
		}

		try {
			console.log('Checking for duplicates...');
			
			// Get application to inherit URL
			const application = await prisma.application.findUnique({
				where: { id: applicationId }
			});
			
			// Check if task with same title already exists for this application
			const existingTask = await prisma.task.findFirst({
				where: {
					applicationId,
					title: title.trim()
				}
			});
			console.log('Query result:', existingTask);

			if (existingTask) {
				console.log('DUPLICATE TASK FOUND:', existingTask.title);
				return fail(400, { error: 'A task with this title already exists' });
			}
			
			console.log('No duplicate found, creating task...');

			// Get the task type to use its default time if none provided
			const taskType = await prisma.taskType.findUnique({
				where: { id: taskTypeId }
			});

			console.log('Task type:', taskType);
			console.log('Time estimate from form:', timeEstimate);

			const finalTimeEstimate = timeEstimate && timeEstimate.trim() 
				? parseFloat(timeEstimate) 
				: taskType?.defaultTime;
			
			// Get next globalOrder (across all tasks)
			const maxGlobalOrder = await prisma.task.findFirst({
				orderBy: { globalOrder: 'desc' },
				select: { globalOrder: true }
			});
			const nextGlobalOrder = (maxGlobalOrder?.globalOrder || 0) + 1;
			
			console.log('Final time estimate:', finalTimeEstimate);
			console.log('Next global order:', nextGlobalOrder);

			const task = await prisma.task.create({
				data: {
					applicationId,
					taskTypeId,
					title: title.trim(),
					description: description.trim(),
					timeEstimate: finalTimeEstimate,
					globalOrder: nextGlobalOrder,
					status: 'pending',
					url: (application as any)?.url, // inherit application URL
					...(order && order.trim() ? { order: parseInt(order) } : {})
				} as any
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
		const order = formData.get('order') as string;
		
		if (!taskId) {
			return fail(400, { error: 'Task ID is required' });
		}

		try {
			const updateData: any = {};
			
			// Only update status if it's explicitly provided and not empty
			if (status && status.trim()) {
				updateData.status = status;
				updateData.completedAt = status === 'completed' ? new Date() : null;
			}
			
			// Only update timeEstimate if it's explicitly provided
			if (timeEstimate && timeEstimate.trim()) {
				updateData.timeEstimate = parseFloat(timeEstimate);
			}

			// Only update order if it's explicitly provided
			if (order && order.trim()) {
				(updateData as any).order = parseInt(order);
			}

			// If no fields to update, return early
			if (Object.keys(updateData).length === 0) {
				return fail(400, { error: 'No valid fields to update' });
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
	},

	updateTasks: async ({ request, params }) => {
		console.log('UPDATE TASKS ACTION TRIGGERED');
		const formData = await request.formData();
		const tasksJson = formData.get('tasks') as string;
		const { applicationId } = params;
		
		console.log('Received tasks JSON:', tasksJson);
		console.log('Application ID:', applicationId);
		
		if (!tasksJson) {
			return fail(400, { error: 'Tasks data is required' });
		}

		if (!applicationId) {
			return fail(400, { error: 'Application ID is required' });
		}

		try {
			const tasks = JSON.parse(tasksJson);
			const taskEntries = Object.entries(tasks);

			// Get all tasks for this application to validate against complete set
			const allTasks = await prisma.task.findMany({
				where: { applicationId }
			});

			// Create a map of all tasks with updated values
			const taskMap = new Map();
			
			// Start with existing tasks
			allTasks.forEach(task => {
				taskMap.set(task.id, {
					title: task.title,
					order: (task as any).order
				});
			});

			// Apply updates from editing
			taskEntries.forEach(([taskId, data]: [string, any]) => {
				if (taskMap.has(taskId)) {
					const existing = taskMap.get(taskId);
					taskMap.set(taskId, {
						title: data.title?.trim() || existing.title,
						order: data.order !== undefined ? parseInt(data.order.toString()) || null : existing.order
					});
				}
			});

			const allTaskValues = Array.from(taskMap.values());

			// Validation: Check for duplicate task names
			const allTitles = allTaskValues
				.map(task => task.title?.trim())
				.filter(title => title);
			const uniqueTitles = new Set(allTitles);
			if (allTitles.length !== uniqueTitles.size) {
				return fail(400, { error: 'Duplicate task names are not allowed' });
			}

			// Validation: Check for duplicate orders and sequence from 1
			const allOrders = allTaskValues
				.map(task => task.order)
				.filter(order => order !== null && order !== undefined)
				.map(order => parseInt(order.toString()))
				.filter(order => !isNaN(order));
			
			if (allOrders.length > 0) {
				const uniqueOrders = new Set(allOrders);
				if (allOrders.length !== uniqueOrders.size) {
					return fail(400, { error: 'Duplicate order values are not allowed' });
				}

				// Check if orders form a sequence starting from 1
				const sortedOrders = [...uniqueOrders].sort((a, b) => a - b);
				const expectedSequence = Array.from({ length: sortedOrders.length }, (_, i) => i + 1);
				if (!sortedOrders.every((order, index) => order === expectedSequence[index])) {
					return fail(400, { error: 'Order values must be in sequence starting from 1' });
				}
			}

			// Check for duplicate task names against existing tasks in the application
			for (const [taskId, taskData] of taskEntries) {
				const data = taskData as any;
				if (data.title && data.title.trim()) {
					const existingTask = await prisma.task.findFirst({
						where: {
							applicationId,
							title: data.title.trim(),
							id: { not: taskId } // Exclude the current task
						}
					});

					if (existingTask) {
						return fail(400, { error: `Task name "${data.title.trim()}" already exists` });
					}
				}
			}

			// Perform updates
			const updatePromises = [];
			for (const [taskId, taskData] of taskEntries) {
				const updateData: any = {};
				const data = taskData as any;

				// Update fields that have changed
				if (data.title !== undefined && data.title.trim()) {
					updateData.title = data.title.trim();
				}
				if (data.description !== undefined) {
					updateData.description = data.description.trim() || null;
				}
				if (data.order !== undefined && data.order !== null) {
					(updateData as any).order = parseInt(data.order.toString()) || null;
				}
				if (data.time_estimate !== undefined && data.time_estimate !== null) {
					updateData.timeEstimate = parseFloat(data.time_estimate.toString()) || 0;
				}
				if (data.url !== undefined) {
					updateData.url = data.url.trim() || null;
				}

				// Only update if there are actual changes
				if (Object.keys(updateData).length > 0) {
					updatePromises.push(
						prisma.task.update({
							where: { id: taskId },
							data: updateData
						})
					);
				}
			}

			if (updatePromises.length > 0) {
				console.log('Executing', updatePromises.length, 'database updates...');
				await Promise.all(updatePromises);
				console.log('All database updates completed successfully');
			}

			console.log('updateTasks action completed successfully');
			return { success: true };
		} catch (error) {
			console.error('Error updating tasks:', error);
			return fail(500, { error: 'Failed to update tasks' });
		}
	},

	applyTemplate: async ({ params }) => {
		console.log('APPLY TEMPLATE ACTION TRIGGERED');
		const { applicationId } = params;
		
		if (!applicationId) {
			return fail(400, { error: 'Application ID is required' });
		}

		try {
			// Check if application already has tasks
			const existingTasks = await prisma.task.findMany({
				where: { applicationId }
			});

			if (existingTasks.length > 0) {
				return fail(400, { error: 'Template can only be applied to applications without tasks' });
			}

			// Get application to inherit URL
			const application = await prisma.application.findUnique({
				where: { id: applicationId }
			});

			// Get task types for the template
			const taskTypes = await prisma.taskType.findMany();
			const essayDraftType = taskTypes.find(t => t.type === 'essay-draft')!;
			const essayFinalType = taskTypes.find(t => t.type === 'essay-final')!;
			const notificationType = taskTypes.find(t => t.type === 'notification')!;
			const timeboxType = taskTypes.find(t => t.type === 'timebox')!

			// Get next globalOrder starting point
			const maxGlobalOrder = await prisma.task.findFirst({
				orderBy: { globalOrder: 'desc' },
				select: { globalOrder: true }
			});
			const startingGlobalOrder = (maxGlobalOrder?.globalOrder || 0) + 1;

			// Template tasks to create
			const templateTasks = [
				{
					title: 'Essay Draft',
					description: 'Write first draft of application essays',
					taskTypeId: essayDraftType.id,
					timeEstimate: essayDraftType.defaultTime || 2,
					order: 1,
					globalOrder: startingGlobalOrder
				},
				{
					title: 'Essay Final',
					description: 'Finalize and polish application essays',
					taskTypeId: essayFinalType.id,
					timeEstimate: essayFinalType.defaultTime || 1,
					order: 2,
					globalOrder: startingGlobalOrder + 1
				},
				{
					title: 'Tests & Transcripts',
					description: 'Submit standardized test scores and official transcripts',
					taskTypeId: notificationType.id,
					timeEstimate: 0,
					order: 3,
					globalOrder: startingGlobalOrder + 2
				},
				{
					title: 'Recommendations',
					description: 'Request and follow up on letters of recommendation',
					taskTypeId: notificationType.id,
					timeEstimate: 0,
					order: 4,
					globalOrder: startingGlobalOrder + 3
				},
				{
					title: 'Rest of Form',
					description: 'Complete remaining application form sections',
					taskTypeId: timeboxType.id,
					timeEstimate: 2,
					order: 5,
					globalOrder: startingGlobalOrder + 4
				}
			];

			// Create all template tasks
			const createdTasks = await Promise.all(
				templateTasks.map(taskData => 
					prisma.task.create({
						data: {
							applicationId,
							...taskData,
							status: 'pending',
							url: (application as any)?.url // inherit application URL
						} as any
					})
				)
			);

			console.log('Template applied successfully:', createdTasks.length, 'tasks created');
			return { success: true, tasksCreated: createdTasks.length };

		} catch (error) {
			console.error('Error applying template:', error);
			return fail(500, { error: 'Failed to apply template' });
		}
	}
};