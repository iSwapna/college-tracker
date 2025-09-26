<script lang="ts" context="module">
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

	// Props
	export let programDetails: ProgramDetails | null;
	export let loading: boolean;
	export let saving: boolean;
	export let schoolName: string;
	export let showAddTaskForm: boolean;
	export let newTaskTitle: string;
	export let newTaskTime: string;
	export let newTaskStatus: boolean;
	export let draggedIndex: number | null;
	export let draggedOverIndex: number | null;

	// Event handlers
	export let updateTimeEstimate: (taskIndex: number, value: string) => void;
	export let toggleTaskStatus: (taskIndex: number) => void;
	export let addTask: () => void;
	export let toggleAddTaskForm: () => void;
	export let cancelAddTask: () => void;
	export let deleteTask: (taskIndex: number) => void;
	export let saveApplication: () => void;
	export let goBack: () => void;
	export let cancelChanges: () => void;
	export let handleDragStart: (event: DragEvent, index: number) => void;
	export let handleDragOver: (event: DragEvent, index: number) => void;
	export let handleDragLeave: () => void;
	export let handleDrop: (event: DragEvent, dropIndex: number) => void;
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
					on:click={goBack}
					class="inline-flex items-center text-gray-600 hover:text-black px-2 py-1 rounded"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
					</svg>
					Back to Schools
				</button>
				<button
					on:click={saveApplication}
					class="bg-white text-black border-2 border-black px-6 py-2 rounded-lg hover:bg-gray-100"
					disabled={saving}
				>
					{saving ? 'Saving...' : 'Save'}
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
								class="cursor-move hover:bg-gray-50 transition-colors {task.status ? 'bg-green-50' : ''}"
								class:group={true}
								class:opacity-50={draggedIndex === index}
								class:bg-blue-100={draggedOverIndex === index}
								draggable="true"
								on:dragstart={(e) => handleDragStart(e, index)}
								on:dragover={(e) => handleDragOver(e, index)}
								on:dragleave={handleDragLeave}
								on:drop={(e) => handleDrop(e, index)}
							>
								<td class="pl-4 pr-1 py-2">
									<input
										type="checkbox"
										checked={!!task.status}
										on:change={() => toggleTaskStatus(index)}
										class="w-5 h-5 text-green-600"
									/>
								</td>
								<td class="pl-1 pr-4 py-2">
									<div class="flex items-center text-lg">
										<svg class="w-5 h-5 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
											<path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
										</svg>
										{index + 1}
									</div>
								</td>
								<td class="px-4 py-2 font-medium relative text-lg">
									{task.title}
									<button 
										on:click={() => deleteTask(index)}
										class="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 text-xl font-bold"
									>
										×
									</button>
								</td>
								<td class="px-4 py-2">
									<input
										type="number"
										value={task.time_estimate || ''}
										on:input={(e) => updateTimeEstimate(index, e.currentTarget.value)}
										class="w-24 px-3 py-2 border border-gray-300 rounded text-lg"
										placeholder="0"
										min="0"
										step="0.5"
									/>
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
								on:click={toggleAddTaskForm}
								class="text-black hover:bg-gray-100 px-2 py-1 rounded text-4xl font-thin"
							>
								+
							</button>
						</div>
					{:else}
						<div class="border border-gray-300 p-4 rounded-lg bg-gray-50">
							<h4 class="text-lg font-semibold mb-3">Add New Task</h4>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label for="new-task-title" class="block text-sm font-medium text-gray-700 mb-1">Task</label>
									<input
										id="new-task-title"
										type="text"
										bind:value={newTaskTitle}
										placeholder="Enter task name"
										class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
									/>
								</div>
								<div>
									<label for="new-task-time" class="block text-sm font-medium text-gray-700 mb-1">Time (h)</label>
									<input
										id="new-task-time"
										type="number"
										bind:value={newTaskTime}
										placeholder="0"
										min="0"
										step="0.5"
										class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
									/>
								</div>
								<div class="flex items-end">
									<label class="flex items-center">
										<input
											type="checkbox"
											bind:checked={newTaskStatus}
											class="w-4 h-4 text-green-600 mr-2"
										/>
										<span class="text-sm font-medium text-gray-700">Completed</span>
									</label>
								</div>
							</div>
							<div class="flex justify-end gap-2 mt-4">
								<button 
									on:click={cancelAddTask}
									class="px-3 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
								>
									Cancel
								</button>
								<button 
									on:click={addTask}
									class="px-3 py-1 bg-black text-white rounded hover:bg-gray-800"
								>
									Add Task
								</button>
							</div>
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