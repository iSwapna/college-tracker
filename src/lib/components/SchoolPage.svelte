<script lang="ts">
	import Header from '$lib/Header.svelte';
	import type { SavedApplication } from '$lib/types';


	export let savedApplications: SavedApplication[];
	export let showAddForm: boolean;
	export let showDeleteConfirm: boolean;
	export let deleteTarget: string | null;
	export let newSchoolName: string;
	export let newSchoolDeadline: string;
	export let newSchoolUrl: string;
	export let addSchool: () => void;
	export let toggleAddForm: () => void;
	export let getOverallTimeSummary: () => { totalTime: number; remainingTasks: number; hasIncompleteTasks: boolean; completedTasks: number; totalTasks: number; percentage: number };
	export let getApplicationProgress: (app: SavedApplication) => { completed: number; total: number; percentage: number };
	export let editPlan: (schoolName: string) => void;
	export let confirmDelete: (schoolName: string) => void;
	export let cancelDelete: () => void;
	export let confirmDeleteAction: () => void;
</script>

<div class="min-h-screen bg-white relative">
	<Header />
	
	<main class="container mx-auto px-4 py-8 max-w-4xl pt-24">
		<h1 class="text-3xl font-bold text-center mb-4">Back to School Plan</h1>
		<p class="text-center text-gray-600 mb-8 text-lg">Choose schools</p>

		<!-- Add School Section -->
		<div class="mb-8">
			<button
				onclick={toggleAddForm}
				class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-left bg-white hover:bg-gray-50"
			>
				+ Add School
			</button>
			
			{#if showAddForm}
				<div class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
					<h3 class="text-lg font-semibold mb-4">Add New School</h3>
					<div class="space-y-4">
						<div>
							<label for="school-name" class="block text-sm font-medium text-gray-700 mb-1">School Name</label>
							<input
								id="school-name"
								type="text"
								bind:value={newSchoolName}
								class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								placeholder="Enter school name"
							/>
						</div>
						<div>
							<label for="school-deadline" class="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
							<input
								id="school-deadline"
								type="date"
								bind:value={newSchoolDeadline}
								class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-transparent"
							/>
						</div>
						<div>
							<label for="school-url" class="block text-sm font-medium text-gray-700 mb-1">Application URL (optional)</label>
							<input
								id="school-url"
								type="url"
								bind:value={newSchoolUrl}
								class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-transparent"
								placeholder="https://school.edu/apply"
							/>
						</div>
						<div class="flex gap-3">
							<button
								onclick={addSchool}
								class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
							>
								Add School
							</button>
							<button
								onclick={toggleAddForm}
								class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Progress Section -->
			{#if getOverallTimeSummary().hasIncompleteTasks}
				{@const summary = getOverallTimeSummary()}
				<div class="mt-4">
					<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
						<!-- Progress Section -->
						<div class="mb-4">
							<div class="flex justify-between items-center mb-2">
								<span class="text-sm font-medium text-gray-700">Progress</span>
								<span class="text-sm text-gray-600">{summary.percentage}%</span>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-3">
								<div 
									class="bg-green-600 h-3 rounded-full transition-all duration-300" 
									style="width: {summary.percentage}%"
								></div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<h5 class="text-sm font-semibold mb-1 text-gray-800">Remaining Time:</h5>
								<div class="text-xl font-bold text-red-600">
									{summary.totalTime}h
								</div>
							</div>
							
							<div>
								<h5 class="text-sm font-semibold mb-1 text-gray-800">Remaining Tasks:</h5>
								<div class="text-xl font-bold text-orange-600">
									{summary.totalTasks - summary.completedTasks}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Schools Table -->
		{#if savedApplications.length > 0}
			<div class="mb-8">
				<h3 class="text-lg font-semibold mb-3">Schools:</h3>
				<table class="w-full border-collapse border border-gray-300">
					<thead>
						<tr class="bg-gray-100">
							<th class="border border-gray-300 px-4 py-2 text-left">School Name</th>
							<th class="border border-gray-300 px-4 py-2 text-left">Deadline</th>
							<th class="border border-gray-300 px-4 py-2 text-left">Status</th>
							<th class="border border-gray-300 px-4 py-2 text-left">Action</th>
						</tr>
					</thead>
					<tbody>
						<!-- Applications -->
						{#each savedApplications as app}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="border border-gray-300 px-4 py-2">
									<div class="flex items-center justify-between">
										<span>{app.school_name}</span>
										<button
											onclick={() => confirmDelete(app.school_name)}
											class="text-gray-500 hover:text-red-600 text-sm ml-2"
											aria-label="Delete {app.school_name}"
										>
											×
										</button>
									</div>
								</td>
								<td class="border border-gray-300 px-4 py-2">
									{#if app.deadline}
										<span class="text-sm">{new Date(app.deadline).toLocaleDateString()}</span>
									{:else}
										<span class="text-gray-400 text-sm">No deadline</span>
									{/if}
								</td>
								<td class="border border-gray-300 px-4 py-2">
									{#if getApplicationProgress(app).total > 0}
										{@const progress = getApplicationProgress(app)}
										<div class="space-y-1">
											<div class="flex justify-between items-center text-sm">
												<span class="font-medium">{progress.percentage}%</span>
												<span class="text-gray-600"><span class="text-red-600 font-bold">{progress.total - progress.completed}</span> remaining</span>
											</div>
											<div class="w-full bg-gray-200 rounded-full h-2">
												<div 
													class="bg-green-600 h-2 rounded-full transition-all duration-300" 
													style="width: {progress.percentage}%"
												></div>
											</div>
										</div>
									{:else}
										<span class="capitalize">{app.status.replace('_', ' ')}</span>
									{/if}
								</td>
								<td class="border border-gray-300 px-4 py-2">
									<button 
										onclick={() => editPlan(app.school_name)}
										class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm"
									>
										Edit
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="text-center py-8 text-gray-500">
				<p>Add schools above to start tracking applications</p>
			</div>
		{/if}
	</main>

	<!-- Delete Confirmation Modal -->
	{#if showDeleteConfirm && deleteTarget}
		<div class="fixed inset-0 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border-2 border-gray-300">
				<h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
				<p class="text-gray-600 mb-6">
					Are you sure you want to delete <strong>{deleteTarget}</strong>? 
					You will lose any saved progress.
				</p>
				<div class="flex gap-3 justify-end">
					<button
						onclick={cancelDelete}
						class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						onclick={confirmDeleteAction}
						class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>