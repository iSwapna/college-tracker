<script lang="ts" module>
	export interface ProgramDetails {
		program: {
			id: string;
			name: string;
			deadline: string;
			website: string;
			highlights?: string;
		};
		tasks: TaskItem[];
		summary: {
			total_tasks: number;
			total_time_hours: number;
			timebox_tasks: number;
			notification_tasks: number;
		};
	}

	export interface TaskItem {
		id?: string;
		title: string;
		description: string;
		task_type: string;
		task_type_id: string;
		time_estimate: number | null;
		priority: string;
		status?: boolean;
	}
</script>

<script lang="ts">
	import Header from '$lib/Header.svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	// Props
	let { application, taskTypes, form }: { 
		application: any; 
		taskTypes: Array<{id: string, type: string, defaultTime: number | null}>;
		form?: any;
	} = $props();

	// Component state
	let programDetails: ProgramDetails | null = $state(null);
	let loading = false;
	let showAddTaskForm = $state(false);
	let newTaskTitle = $state('');
	let newTaskTime = $state('');
	let newTaskTypeId = $state('');

	// Initialize program details from server data
	if (application) {
		programDetails = {
			program: {
				id: application.id,
				name: application.schoolName,
				deadline: application.deadline.toISOString(),
				website: application.url || '#',
				highlights: ''
			},
			tasks: application.tasks.map((task: any) => ({
				id: task.id,
				title: task.title,
				description: task.description || '',
				task_type: task.taskType?.type || 'notification',
				task_type_id: task.taskTypeId,
				time_estimate: task.timeEstimate,
				priority: 'medium',
				status: task.status === 'completed'
			})),
			summary: {
				total_tasks: 0,
				total_time_hours: 0,
				timebox_tasks: 0,
				notification_tasks: 0
			}
		};
		recalcSummary();
	}

	function recalcSummary() {
		if (!programDetails) return;
		const total_time = programDetails.tasks.reduce((sum, t) => sum + (t.time_estimate || 0), 0);
		
		const timeboxTasks = programDetails.tasks.filter(t => ['timebox', 'essay-draft', 'essay-final'].includes(t.task_type));
		const notificationTasks = programDetails.tasks.filter(t => t.task_type === 'notification');
		
		programDetails.summary = {
			total_tasks: programDetails.tasks.length,
			total_time_hours: total_time,
			timebox_tasks: timeboxTasks.length,
			notification_tasks: notificationTasks.length
		};
	}

	// Form toggle functions
	function toggleAddTaskForm() {
		showAddTaskForm = true;
		// Set default task type if available
		if (taskTypes && taskTypes.length > 0) {
			newTaskTypeId = taskTypes[0].id;
			// Auto-populate time with default time
			const defaultTaskType = taskTypes[0];
			newTaskTime = defaultTaskType.defaultTime ? defaultTaskType.defaultTime.toString() : '';
		}
	}

	function cancelAddTask() {
		showAddTaskForm = false;
		newTaskTitle = '';
		newTaskTime = '';
		newTaskTypeId = '';
	}

	// Update time when task type changes
	function handleTaskTypeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const selectedTaskTypeId = target.value;
		newTaskTypeId = selectedTaskTypeId;
		
		// Find the selected task type and update time
		const selectedTaskType = taskTypes.find(t => t.id === selectedTaskTypeId);
		newTaskTime = selectedTaskType?.defaultTime ? selectedTaskType.defaultTime.toString() : '';
	}

	// Enhanced form submission handler
	function handleTaskFormSubmit({ formData, cancel }: { formData: FormData; cancel: () => void }) {
		console.log('🚀 Enhanced form submitting...');
		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			console.log('📥 Form result:', result);
			
			if (result.type === 'success') {
				// Task was successfully created
				console.log('✅ Task created successfully', result.data);
				
				// Add the new task to local state
				if (result.data?.task && programDetails) {
					const newTask = {
						id: result.data.task.id,
						title: result.data.task.title,
						description: result.data.task.description || '',
						task_type: result.data.task.taskType?.type || 'notification',
						task_type_id: result.data.task.taskTypeId,
						time_estimate: result.data.task.timeEstimate,
						priority: 'medium',
						status: result.data.task.status === 'completed'
					};
					
					// Add to tasks array and recalculate summary
					programDetails.tasks = [...programDetails.tasks, newTask];
					recalcSummary();
				}
				
				// Close form and clear inputs
				showAddTaskForm = false;
				newTaskTitle = '';
				newTaskTime = '';
				newTaskTypeId = '';
			} else if (result.type === 'failure') {
				// Validation error - keep form open with user's input preserved
				console.log('❌ Validation failed:', result.data);
				// Don't clear form fields - let user fix the error
			}
			
			// Update the page data
			await update();
		};
	}

	// Navigation functions
	function goBack() {
		goto('/school');
	}

</script>

<div class="min-h-screen bg-white relative">
	<Header />
	
	<main class="container mx-auto px-4 py-8 max-w-4xl pt-24">

		{#if loading}
			<div class="text-center py-8">
				<p class="text-lg">Loading plan...</p>
			</div>
		{:else if programDetails}
			<!-- Action Buttons -->
			<div class="flex justify-between items-center mb-6">
				<button 
					onclick={goBack}
					class="inline-flex items-center text-gray-600 hover:text-black px-2 py-1 rounded"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
					</svg>
					Back to Schools
				</button>
			</div>

			<!-- Tasks Table -->
			<div class="mb-6">
				<!-- School Details Header -->
				<div class="bg-gray-100 p-6 rounded-t-lg">
					<h2 class="text-2xl font-semibold mb-4">Checklist - {programDetails.program.name}</h2>
					{#if programDetails.program.highlights && programDetails.program.highlights.trim()}
						<div class="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
							<p class="text-sm text-gray-700"><strong>Highlights:</strong> {programDetails.program.highlights}</p>
						</div>
					{/if}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- School Info -->
						<div>
							<div class="space-y-2 text-sm">
								<div>
									<strong>Deadline:</strong> {new Date(programDetails.program.deadline).toLocaleDateString()}
								</div>
								<div>
									<a href={programDetails.program.website} target="_blank" class="text-blue-600 hover:underline">
										Visit Website
									</a>
								</div>
							</div>
						</div>

						<!-- Summary Section -->
						<div>
							<!-- Progress Section -->
							<div class="mb-4">
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm font-medium text-gray-700">Progress</span>
									<span class="text-sm text-gray-600">{Math.round((programDetails.tasks.filter(t => t.status).length / programDetails.tasks.length) * 100)}%</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-3">
									<div 
										class="bg-green-600 h-3 rounded-full transition-all duration-300" 
										style="width: {(programDetails.tasks.filter(t => t.status).length / programDetails.tasks.length) * 100}%"
									></div>
								</div>
							</div>

							<!-- Remaining Time and Tasks -->
							<div class="grid grid-cols-2 gap-4">
								<div>
									<h5 class="text-sm font-semibold mb-1 text-gray-800">Remaining Time:</h5>
									<div class="text-xl font-bold text-red-600">
										{programDetails.tasks.filter(t => !t.status).reduce((sum, t) => sum + (t.time_estimate || 0), 0)}h
									</div>
								</div>
								
								<div>
									<h5 class="text-sm font-semibold mb-1 text-gray-800">Remaining Tasks:</h5>
									<div class="text-xl font-bold text-orange-600">
										{programDetails.tasks.filter(t => !t.status).length}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<table class="w-full border-collapse rounded-b-lg overflow-hidden">
					<thead>
						<tr class="bg-gray-100">
							<th class="pl-4 pr-1 pt-1 pb-2 text-left"></th>
							<th class="pl-1 pr-4 pt-1 pb-2 text-left"></th>
							<th class="px-4 pt-2 pb-1 text-right text-lg align-top" colspan="2"></th>
						</tr>
					</thead>
					<tbody>
						{#each programDetails.tasks as task, index}
							<tr 
								class="hover:bg-gray-50 transition-colors border-b border-gray-100 {task.status ? 'bg-green-50' : ''}"
								class:group={true}
														>
								<td class="pl-4 pr-1 py-2">
									<form method="POST" action="?/updateTask" class="inline">
										<input type="hidden" name="taskId" value={task.id} />
										<input type="hidden" name="status" value={task.status ? 'pending' : 'completed'} />
										<input
											type="checkbox"
											checked={!!task.status}
											onchange={(e) => (e.target as HTMLInputElement).form?.submit()}
											class="w-5 h-5 text-green-600"
										/>
									</form>
								</td>
								<td class="pl-1 pr-4 py-2">
									<div class="text-lg">
										{index + 1}
									</div>
								</td>
								<td class="px-4 py-2 font-medium relative text-lg">
									{task.title}
									<form method="POST" action="?/deleteTask" class="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity inline">
										<input type="hidden" name="taskId" value={task.id} />
										<button 
											type="submit"
											class="text-red-600 hover:text-red-800 text-xl font-bold"
										>
											×
										</button>
									</form>
								</td>
								<td class="px-4 py-2">
									<span class="text-sm text-gray-600">
										{task.time_estimate || 0}h
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				
				<!-- Add Task Button and Form -->
				<div class="mt-1 pr-4">
					{#if !showAddTaskForm}
						<div class="flex justify-end items-center gap-2">
							<button 
								onclick={toggleAddTaskForm}
								class="text-black hover:bg-gray-100 px-2 py-1 rounded text-4xl font-thin"
							>
								+
							</button>
						</div>
					{:else}
						<div class="border border-gray-300 p-4 rounded-lg bg-gray-50">
							<h4 class="text-lg font-semibold mb-3">Add New Task</h4>
							{#if form?.error}
								<div class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
									<p class="text-sm text-red-600">{form.error}</p>
								</div>
							{/if}
							<form method="POST" action="?/addTask" use:enhance={handleTaskFormSubmit}>
								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<label for="new-task-title" class="block text-sm font-medium text-gray-700 mb-1">Task</label>
										<input
											id="new-task-title"
											name="title"
											type="text"
											bind:value={newTaskTitle}
											placeholder="Enter task name"
											class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
											required
										/>
									</div>
									<div>
										<label for="new-task-time" class="block text-sm font-medium text-gray-700 mb-1">Time (h)</label>
										<input
											id="new-task-time"
											name="timeEstimate"
											type="number"
											bind:value={newTaskTime}
											placeholder="0"
											min="0"
											step="0.5"
											class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
										/>
									</div>
									<div>
										<label for="task-type" class="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
										<select
											id="task-type"
											name="taskTypeId"
											bind:value={newTaskTypeId}
											onchange={handleTaskTypeChange}
											class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
											required
										>
											{#each taskTypes as taskType}
												<option value={taskType.id}>{taskType.type}</option>
											{/each}
										</select>
									</div>
								</div>
								<div class="flex justify-end gap-2 mt-4">
									<button 
										type="button"
										onclick={cancelAddTask}
										class="px-3 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
									>
										Cancel
									</button>
									<button 
										type="submit"
										class="px-3 py-1 bg-black text-white rounded hover:bg-gray-800"
									>
										Add Task
									</button>
								</div>
							</form>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-lg text-red-600">Failed to load program details</p>
			</div>
		{/if}
	</main>
</div>