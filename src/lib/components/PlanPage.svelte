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
		order: number | null;
		priority: string;
		status?: boolean;
		url?: string;
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
	let newTaskDescription = $state('');
	let newTaskTime = $state('');
	let newTaskTypeId = $state('');
	let newTaskOrder = $state('');
	let sortBy = $state('order'); // 'order', 'title', 'time'
	let sortDirection = $state('asc'); // 'asc' or 'desc'
	let editingTask = $state<string | null>(null); // task ID being edited
	let editingTasks = $state<{[taskId: string]: any}>({});
	let hasUnsavedChanges = $state(false);
	let saveError = $state<string | null>(null);

	// Derived state: Get current task values (original or edited)
	let currentTasks = $derived(
		programDetails?.tasks.map(t => ({
			...t,
			time_estimate: editingTasks[t.id || '']?.time_estimate !== undefined
				? editingTasks[t.id || ''].time_estimate
				: t.time_estimate
		})) || []
	);

	// Derived state: Calculate remaining time from current task values
	let remainingTime = $derived(
		currentTasks.filter(t => !t.status).reduce((sum, t) => sum + (t.time_estimate || 0), 0)
	);

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
				order: task.order,
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
		// Set default order to next number in sequence
		if (programDetails) {
			const maxOrder = Math.max(0, ...programDetails.tasks.map(t => t.order || 0));
			newTaskOrder = (maxOrder + 1).toString();
		}
	}

	function cancelAddTask() {
		showAddTaskForm = false;
		newTaskTitle = '';
		newTaskDescription = '';
		newTaskTime = '';
		newTaskTypeId = '';
		newTaskOrder = '';
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
						order: result.data.task.order,
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
				newTaskDescription = '';
				newTaskTime = '';
				newTaskTypeId = '';
				newTaskOrder = '';
			} else if (result.type === 'failure') {
				// Validation error - keep form open with user's input preserved
				console.log('❌ Validation failed:', result.data);
				// Don't clear form fields - let user fix the error
			}
			
			// Update the page data
			await update();
		};
	}

	// Sorting function
	function sortTasks(tasks: TaskItem[]) {
		const sorted = [...tasks];
		const direction = sortDirection === 'asc' ? 1 : -1;
		
		if (sortBy === 'order') {
			return sorted.sort((a, b) => direction * ((a.order || 0) - (b.order || 0)));
		} else if (sortBy === 'title') {
			return sorted.sort((a, b) => direction * a.title.localeCompare(b.title));
		} else if (sortBy === 'time') {
			return sorted.sort((a, b) => direction * ((a.time_estimate || 0) - (b.time_estimate || 0)));
		}
		return tasks;
	}

	// Handle sort column click
	function handleSort(column: string) {
		if (sortBy === column) {
			// Toggle direction if same column
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New column, start with ascending
			sortBy = column;
			sortDirection = 'asc';
		}
	}

	// Task editing functions
	function startEditingTask(taskId: string, task: TaskItem) {
		editingTask = taskId;
		editingTasks[taskId] = {
			title: task.title,
			description: task.description,
			order: task.order,
			time_estimate: task.time_estimate,
			url: task.url,
			task_type_id: task.task_type_id
		};
		hasUnsavedChanges = true;
	}

	function updateEditingField(taskId: string, field: string, value: any) {
		console.log('📝 Field update:', { taskId, field, value });
		
		if (!editingTasks[taskId]) {
			const task = programDetails?.tasks.find(t => t.id === taskId);
			if (!task) {
				console.log('❌ Task not found:', taskId);
				return;
			}
			editingTasks[taskId] = {
				title: task.title,
				description: task.description,
				order: task.order,
				time_estimate: task.time_estimate,
				url: task.url,
				task_type_id: task.task_type_id
			};
			console.log('🆕 Created new editing entry for task:', taskId);
		}
		editingTasks[taskId][field] = value;
		hasUnsavedChanges = true;
		console.log('✅ Updated field. hasUnsavedChanges:', hasUnsavedChanges);
		console.log('📊 Current editingTasks:', editingTasks);
	}

	// Handle save changes with optimistic UI update
	function handleSaveChanges() {
		console.log('🔄 Save changes enhance triggered');
		return async ({ result }: { result: any }) => {
			console.log('📥 Save result:', result);

			if (result.type === 'success') {
				console.log('✅ Save successful');
				// Apply changes to programDetails optimistically
				if (programDetails) {
					Object.entries(editingTasks).forEach(([taskId, updates]: [string, any]) => {
						const task = programDetails.tasks.find(t => t.id === taskId);
						if (task) {
							if (updates.title !== undefined) task.title = updates.title;
							if (updates.description !== undefined) task.description = updates.description;
							if (updates.time_estimate !== undefined) task.time_estimate = updates.time_estimate;
							if (updates.order !== undefined) task.order = updates.order;
							if (updates.url !== undefined) task.url = updates.url;
							if (updates.task_type_id !== undefined) {
								task.task_type_id = updates.task_type_id;
								// Update the task_type display name
								const taskType = taskTypes.find(tt => tt.id === updates.task_type_id);
								if (taskType) task.task_type = taskType.type;
							}
						}
					});
					recalcSummary();
				}
				// Clear editing state
				editingTasks = {};
				hasUnsavedChanges = false;
				editingTask = null;
				saveError = null;
			} else if (result.type === 'failure') {
				console.log('❌ Save failed:', result.data);
				saveError = result.data?.error || 'Failed to save changes';
			}
			// Don't call update() - we already updated UI optimistically
		};
	}

	function cancelEditing() {
		editingTask = null;
		editingTasks = {};
		hasUnsavedChanges = false;
		saveError = null;
	}

	// Delete task handler with optimistic UI update
	function handleDeleteTask(taskId: string) {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				// Optimistically update local state - no page reload
				if (programDetails) {
					programDetails.tasks = programDetails.tasks.filter(t => t.id !== taskId);
					recalcSummary();
					// Clean up any pending edits for this deleted task
					if (editingTasks[taskId]) {
						delete editingTasks[taskId];
						// Recheck if we still have unsaved changes
						hasUnsavedChanges = Object.keys(editingTasks).length > 0;
					}
				}
			}
			// Don't call update() - we already updated UI optimistically
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

			<!-- Tasks Section -->
			<div class="mb-6">
				<!-- School Details Header -->
				<div class="bg-gray-100 p-6 rounded-t-lg">
					<h2 class="text-2xl font-semibold mb-4">Application Tasks - {programDetails.program.name}</h2>
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
									<div class="flex justify-between items-end">
										<div>
											<h5 class="text-sm font-semibold mb-1 text-gray-800">Remaining Time:</h5>
											<div class="text-xl font-bold text-red-600">
												{remainingTime}h
											</div>
										</div>
										{#if hasUnsavedChanges}
											<div class="flex gap-1">
												<form method="POST" action="?/updateTasks" use:enhance={handleSaveChanges} class="inline">
													<input type="hidden" name="tasks" value={JSON.stringify(editingTasks)} />
													<button
														type="submit"
														class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
													>
														Save
													</button>
												</form>
												<button
													onclick={cancelEditing}
													class="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500"
												>
													Cancel
												</button>
											</div>
										{/if}
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
				
				<!-- Error Display -->
				{#if saveError}
					<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
						<p class="text-sm text-red-600">{saveError}</p>
					</div>
				{/if}
				
				<table class="w-full border-collapse rounded-b-lg overflow-hidden">
					<thead>
						<tr class="bg-gray-100">
							<th class="pl-4 pr-1 pt-2 pb-2 text-left text-sm font-medium">✓</th>
							<th class="pl-1 pr-4 pt-2 pb-2 text-left text-sm font-medium">
								<button onclick={() => handleSort('order')} class="hover:text-blue-600 {sortBy === 'order' ? 'text-blue-600 font-bold' : ''}">
									Order {sortBy === 'order' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-4 pt-2 pb-2 text-left text-sm font-medium">
								<button onclick={() => handleSort('title')} class="hover:text-blue-600 {sortBy === 'title' ? 'text-blue-600 font-bold' : ''}">
									Task {sortBy === 'title' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
								</button>
							</th>
							<th class="px-4 pt-2 pb-2 text-right text-sm font-medium">
								<button onclick={() => handleSort('time')} class="hover:text-blue-600 {sortBy === 'time' ? 'text-blue-600 font-bold' : ''}">
									Time {sortBy === 'time' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
								</button>
							</th>
						</tr>
					</thead>
					<tbody>
						{#each sortTasks(programDetails.tasks) as task, index}
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
									<input
										type="number"
										value={editingTasks[task.id || '']?.order ?? task.order ?? index + 1}
										min="1"
										class="w-12 text-center text-sm border border-gray-300 rounded hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
										oninput={(e) => {
											const target = e.target as HTMLInputElement;
											updateEditingField(task.id || '', 'order', parseInt(target.value) || null);
										}}
										onfocus={() => startEditingTask(task.id || '', task)}
									/>
								</td>
								<td class="px-4 py-2 font-medium relative">
									<div class="flex items-center gap-2">
										<input
											type="text"
											value={editingTasks[task.id || '']?.title ?? task.title}
											class="flex-1 text-lg font-medium border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 bg-transparent px-0 py-1"
											oninput={(e) => {
												const target = e.target as HTMLInputElement;
												updateEditingField(task.id || '', 'title', target.value);
											}}
											onfocus={() => startEditingTask(task.id || '', task)}
										/>
										<select
											value={editingTasks[task.id || '']?.task_type_id ?? task.task_type_id}
											class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded border-0 hover:bg-gray-200 focus:bg-gray-200 focus:ring-1 focus:ring-blue-500"
											onchange={(e) => {
												const target = e.target as HTMLSelectElement;
												updateEditingField(task.id || '', 'task_type_id', target.value);
											}}
											onfocus={() => startEditingTask(task.id || '', task)}
										>
											{#each taskTypes as taskType}
												<option value={taskType.id}>{taskType.type}</option>
											{/each}
										</select>
									</div>
									<input
										type="text"
										value={editingTasks[task.id || '']?.description ?? task.description ?? ''}
										placeholder="Add description..."
										class="w-full text-sm text-gray-600 mt-1 border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 bg-transparent px-0 py-1"
										oninput={(e) => {
											const target = e.target as HTMLInputElement;
											updateEditingField(task.id || '', 'description', target.value);
										}}
										onfocus={() => startEditingTask(task.id || '', task)}
									/>
									<input
										type="url"
										value={editingTasks[task.id || '']?.url ?? task.url ?? application?.url ?? ''}
										placeholder={application?.url ? `Default: ${application.url}` : 'Enter URL'}
										class="w-full text-xs text-gray-500 mt-1 border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 bg-transparent px-0 py-1"
										oninput={(e) => {
											const target = e.target as HTMLInputElement;
											updateEditingField(task.id || '', 'url', target.value);
										}}
										onfocus={() => startEditingTask(task.id || '', task)}
									/>
									{#if (editingTasks[task.id || '']?.url ?? task.url)}
										<div class="mt-1">
											<a href={editingTasks[task.id || '']?.url ?? task.url} target="_blank" class="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
												</svg>
												Open Application
											</a>
										</div>
									{/if}
									<form method="POST" action="?/deleteTask" use:enhance={() => handleDeleteTask(task.id || '')} class="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity inline">
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
									<div class="flex items-center">
										<input
											type="number"
											value={editingTasks[task.id || '']?.time_estimate ?? task.time_estimate ?? 0}
											min="0"
											step="0.5"
											class="w-16 text-sm text-center border border-gray-300 rounded hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
											oninput={(e) => {
												const target = e.target as HTMLInputElement;
												updateEditingField(task.id || '', 'time_estimate', parseFloat(target.value) || 0);
											}}
											onfocus={() => startEditingTask(task.id || '', task)}
										/>
										<span class="text-sm text-gray-600 ml-1">h</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				
				<!-- Template Option and Add Task Button -->
				<div class="mt-1 pr-4">
					{#if programDetails && programDetails.tasks.length === 0 && !showAddTaskForm}
						<!-- Show template option for empty applications -->
						<div class="border border-gray-300 p-4 rounded-lg bg-blue-50 mb-4">
							<h4 class="text-lg font-semibold mb-2">Start with a Template</h4>
							<p class="text-sm text-gray-600 mb-3">
								Get started quickly with our standard college application template, which includes:
							</p>
							<ul class="text-sm text-gray-600 mb-4 ml-4">
								<li>• Essay Draft</li>
								<li>• Essay Final</li>
								<li>• Tests & Transcripts</li>
								<li>• Recommendations</li>
								<li>• Rest of Form</li>
							</ul>
							<div class="flex gap-2">
								<form method="POST" action="?/applyTemplate" class="inline">
									<button 
										type="submit"
										class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
									>
										Use Template
									</button>
								</form>
								<button 
									onclick={toggleAddTaskForm}
									class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
								>
									Start from Scratch
								</button>
							</div>
						</div>
					{:else if !showAddTaskForm}
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
								<div class="space-y-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label for="new-task-title" class="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
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
											<label for="new-task-order" class="block text-sm font-medium text-gray-700 mb-1">Order</label>
											<input
												id="new-task-order"
												name="order"
												type="number"
												bind:value={newTaskOrder}
												placeholder="1"
												min="1"
												class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
											/>
										</div>
									</div>
									<div>
										<label for="new-task-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
										<textarea
											id="new-task-description"
											name="description"
											bind:value={newTaskDescription}
											placeholder="Enter task description (optional)"
											class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
											rows="2"
										></textarea>
									</div>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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