<script lang="ts">
	import PlanPage, { type ProgramDetails, type TaskItem } from '$lib/components/PlanPage.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let programDetails: ProgramDetails | null = null;
	let originalProgramDetails: ProgramDetails | null = null;
	let loading = true;
	let saving = false;
	let schoolName = '';
	let showAddTaskForm = false;
	let newTaskTitle = '';
	let newTaskTime = '';
	let newTaskStatus = false;
	let draggedIndex: number | null = null;
	let draggedOverIndex: number | null = null;

	onMount(async () => {
		await loadProgramDetails();
	});

	async function loadProgramDetails() {
		try {
			const applicationId = $page.params.applicationId;
			schoolName = $page.url.searchParams.get('school') || '';

			// TODO: Load application data from database using applicationId
			// For now, create mock data based on the application
			programDetails = {
				program: {
					id: applicationId,
					name: schoolName || 'Application',
					deadline: new Date().toISOString(),
					website: '#',
					highlights: ''
				},
				tasks: [],
				summary: {
					total_tasks: 0,
					total_time_hours: 0,
					timebox_tasks: 0,
					notification_tasks: 0
				}
			};

			// Store original data for cancel functionality
			originalProgramDetails = JSON.parse(JSON.stringify(programDetails));
			
			// Recalculate summary after loading data
			recalcSummary();
			
		} catch (error) {
			console.error('Error loading program details:', error);
		} finally {
			loading = false;
		}
	}

	function updateTimeEstimate(taskIndex: number, value: string) {
		if (!programDetails) return;
		
		const numValue = value === '' ? null : parseFloat(value);
		const task = programDetails.tasks[taskIndex];
		
		// Update time estimate
		task.time_estimate = numValue;
		
		// Update task type based on time estimate
		if (numValue && numValue > 0) {
			// Find a timebox task type from existing tasks
			const timeboxTask = programDetails.tasks.find(t => ['research', 'draft', 'final'].includes(t.task_type));
			if (timeboxTask && task.task_type === 'notification') {
				task.task_type = timeboxTask.task_type;
				task.task_type_id = timeboxTask.task_type_id;
			}
		} else if (numValue === null || numValue === 0) {
			// If no time estimate, change to notification
			if (['research', 'draft', 'final'].includes(task.task_type)) {
				task.task_type = 'notification';
				task.task_type_id = '672eaadf-7c3f-4bae-b39b-08ec7236387c'; // notification task type ID
			}
		}
		
		programDetails = { ...programDetails };
		recalcSummary();
	}

	function toggleTaskStatus(taskIndex: number) {
		if (!programDetails) return;
		
		programDetails.tasks[taskIndex].status = !programDetails.tasks[taskIndex].status;
		programDetails = { ...programDetails };
	}

	function recalcSummary() {
		if (!programDetails) return;
		const total_time = programDetails.tasks.reduce((sum, t) => sum + (t.time_estimate || 0), 0);
		
		const timeboxTasks = programDetails.tasks.filter(t => ['research', 'draft', 'final'].includes(t.task_type));
		const notificationTasks = programDetails.tasks.filter(t => t.task_type === 'notification');
		
		programDetails.summary = {
			total_tasks: programDetails.tasks.length,
			total_time_hours: total_time,
			timebox_tasks: timeboxTasks.length,
			notification_tasks: notificationTasks.length
		};
		programDetails = { ...programDetails };
	}

	function addTask() {
		if (!programDetails) return;
		
		const taskTitle = newTaskTitle.trim();
		if (!taskTitle) {
			alert('Please enter a task name.');
			return;
		}
		
		// Check for duplicate task names (case-insensitive)
		const existingTask = programDetails.tasks.find(task => 
			task.title.toLowerCase() === taskTitle.toLowerCase()
		);
		
		if (existingTask) {
			alert(`A task with the name "${taskTitle}" already exists. Please choose a different name.`);
			return;
		}
		
		const timeEstimate = newTaskTime === '' ? null : parseFloat(newTaskTime);
		
		// Determine task type based on time estimate
		let taskType = 'notification';
		let taskTypeId = '2d6675cf-23ec-4be3-9550-a3007788ceb3'; // notification task type ID
		
		if (timeEstimate && timeEstimate > 0) {
			// Find a timebox task type from existing tasks
			const timeboxTask = programDetails.tasks.find(t => ['research', 'draft', 'final'].includes(t.task_type));
			if (timeboxTask) {
				taskType = timeboxTask.task_type;
				taskTypeId = timeboxTask.task_type_id;
			} else {
				// Default to 'research' if no timebox task found
				taskType = 'research';
				taskTypeId = 'b6a3d52c-2229-461d-98db-9730f399a36a'; // research task type ID
			}
		}
		
		programDetails.tasks = [
			...programDetails.tasks,
			{
				title: taskTitle,
				description: '',
				task_type: taskType,
				task_type_id: taskTypeId,
				time_estimate: timeEstimate,
				priority: 'medium',
				status: newTaskStatus
			}
		];
		recalcSummary();
		
		// Reset form
		showAddTaskForm = false;
		newTaskTitle = '';
		newTaskTime = '';
		newTaskStatus = false;
	}

	function toggleAddTaskForm() {
		showAddTaskForm = true;
	}

	function cancelAddTask() {
		showAddTaskForm = false;
		newTaskTitle = '';
		newTaskTime = '';
		newTaskStatus = false;
	}

	function deleteTask(taskIndex: number) {
		if (!programDetails) return;
		programDetails.tasks = programDetails.tasks.filter((_, i) => i !== taskIndex);
		recalcSummary();
	}

	async function saveApplication() {
		if (!programDetails) return;
		
		saving = true;
		
		try {
			// TODO: Save to database using application ID
			console.log('Saving application:', $page.params.applicationId);
			console.log('Tasks:', programDetails.tasks);
			
			// Return to school list
			goto('/school');
			
		} catch (error) {
			console.error('Save error:', error);
			alert('Error: ' + (error instanceof Error ? error.message : String(error)));
		} finally {
			saving = false;
		}
	}

	function goBack() {
		goto('/school');
	}

	function cancelChanges() {
		if (originalProgramDetails) {
			// Restore original data
			programDetails = JSON.parse(JSON.stringify(originalProgramDetails));
			recalcSummary();
			
			// Reset form state
			showAddTaskForm = false;
			newTaskTitle = '';
			newTaskTime = '';
			newTaskStatus = false;
			
			// Navigate back to school list
			goto('/school');
		} else {
			// Fallback to just navigating back
			goto('/school');
		}
	}

	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', '');
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		draggedOverIndex = index;
	}

	function handleDragLeave() {
		draggedOverIndex = null;
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		
		if (draggedIndex === null || draggedIndex === dropIndex) {
			draggedIndex = null;
			draggedOverIndex = null;
			return;
		}

		if (!programDetails) return;

		// Reorder tasks in the array
		const tasks = [...programDetails.tasks];
		const draggedTask = tasks[draggedIndex];
		tasks.splice(draggedIndex, 1);
		tasks.splice(dropIndex, 0, draggedTask);

		// Update the programDetails with new order
		programDetails.tasks = tasks;
		programDetails = { ...programDetails };

		// Update order in database
		updateTaskOrder(draggedIndex, dropIndex);

		draggedIndex = null;
		draggedOverIndex = null;
	}

	function updateTaskOrder(fromIndex: number, toIndex: number) {
		// Just update the local state - don't save to database until user clicks Save
		// The visual reordering is already handled in handleDrop()
		console.log(`Task reordered from position ${fromIndex} to ${toIndex}`);
	}
</script>

<PlanPage 
	{programDetails}
	{loading}
	{saving}
	{schoolName}
	{showAddTaskForm}
	{newTaskTitle}
	{newTaskTime}
	{newTaskStatus}
	{draggedIndex}
	{draggedOverIndex}
	{updateTimeEstimate}
	{toggleTaskStatus}
	{addTask}
	{toggleAddTaskForm}
	{cancelAddTask}
	{deleteTask}
	{saveApplication}
	{goBack}
	{cancelChanges}
	{handleDragStart}
	{handleDragOver}
	{handleDragLeave}
	{handleDrop}
/>