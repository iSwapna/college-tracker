<script lang="ts">
	import Header from '$lib/Header.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let activeTab = $state('essays');
	let hideCompleted = $state(false);


	// Helper function to format progress ring
	function getProgressRingPath(percentage: number, radius: number) {
		const circumference = 2 * Math.PI * radius;
		const strokeDasharray = circumference;
		const strokeDashoffset = circumference - (percentage / 100) * circumference;
		return { strokeDasharray, strokeDashoffset };
	}

	// Helper function to calculate time progress percentage
	function getTimeProgressPercentage(): number {
		if (!data.totalWorkTime || data.totalWorkTime === 0) return 0;
		const completedWorkTime = (data.allTasks || [])
			.filter((task: any) => task.status === 'completed' && task.timeEstimate > 0)
			.reduce((sum: number, task: any) => sum + (task.timeEstimate || 0), 0);
		return Math.round((completedWorkTime / data.totalWorkTime) * 100);
	}

	// Helper function to calculate task progress percentage  
	function getTaskProgressPercentage(): number {
		if (!data.allTasks || data.allTasks.length === 0) return 0;
		const completedCount = data.allTasks.filter((task: any) => task.status === 'completed').length;
		return Math.round((completedCount / data.allTasks.length) * 100);
	}

	// Helper function to calculate remaining time
	function getRemainingTime(): number {
		const completedWorkTime = (data.allTasks || [])
			.filter((task: any) => task.status === 'completed' && task.timeEstimate > 0)
			.reduce((sum: number, task: any) => sum + (task.timeEstimate || 0), 0);
		return data.totalWorkTime - completedWorkTime;
	}

	// Helper function to calculate remaining tasks
	function getRemainingTasks(): number {
		if (!data.allTasks || data.allTasks.length === 0) return 0;
		return data.allTasks.length - data.allTasks.filter((task: any) => task.status === 'completed').length;
	}

	// Filter tasks by tab and completion status
	let filteredTasks = $derived(() => {
		const allTasks = data.allPendingTasks || [];
		
		// Filter by tab type with priority order to avoid overlaps
		let tabTasks: any[] = [];
		switch(activeTab) {
			case 'essays':
				tabTasks = allTasks.filter((task: any) => 
					task.taskType?.type === 'essay-draft' || task.taskType?.type === 'essay-final'
				);
				break;
			case 'tests':
				tabTasks = allTasks.filter((task: any) => 
					(task.title?.toLowerCase().includes('test') || 
					task.title?.toLowerCase().includes('transcript')) &&
					!task.title?.toLowerCase().includes('rest of form')
				);
				break;
			case 'recommendations':
				tabTasks = allTasks.filter((task: any) => 
					(task.title?.toLowerCase().includes('recommendation') ||
					task.title?.toLowerCase().includes('reference')) &&
					!task.title?.toLowerCase().includes('rest of form')
				);
				break;
			case 'forms':
				tabTasks = allTasks.filter((task: any) => 
					task.title?.toLowerCase().includes('rest of form')
				);
				break;
			default:
				tabTasks = allTasks;
		}
		
		// Filter by completion status
		return hideCompleted 
			? tabTasks.filter((task: any) => task.status !== 'completed')
			: tabTasks;
	});

	// Calendar navigation
	let calendarContainer: HTMLElement | undefined = $state();
	
	function scrollCalendar(direction: 'left' | 'right') {
		if (calendarContainer) {
			const scrollAmount = 320; // Width of one week card + gap
			calendarContainer.scrollBy({
				left: direction === 'left' ? -scrollAmount : scrollAmount,
				behavior: 'smooth'
			});
		}
	}
</script>

<style>
	/* Hide scrollbar for webkit browsers */
	.calendar-container::-webkit-scrollbar {
		display: none;
	}
</style>

<div class="min-h-screen bg-gray-50">
	<Header />
	
	<main class="container mx-auto px-4 py-8 max-w-7xl pt-24">
		{#if !data.hasApplications}
			<div class="text-center py-16">
				<div class="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
					<h2 class="text-xl font-semibold text-gray-800 mb-4">No Work Planned</h2>
					<p class="text-gray-600 mb-6">Add schools to make plan</p>
					<a 
						href="/school" 
						class="inline-block bg-transparent text-black border border-black px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
					>
						Add Schools
					</a>
				</div>
			</div>
		{:else}
			<!-- Main Grid Layout: Task List + Content -->
			<div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
				<!-- Left Side: Task List (3/5 width) -->
				<div class="lg:col-span-3">
					<div class="bg-white rounded-lg shadow-md p-6 flex flex-col" style="height: calc(100vh - 8rem);">
						<!-- Tabs Header -->
						<div class="mb-4">
							<div class="flex justify-between items-center mb-3">
								<div class="flex border-b border-gray-200">
									<button 
										onclick={() => activeTab = 'essays'}
										class="px-4 py-2 text-sm font-medium border-b-2 {activeTab === 'essays' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'} transition-colors"
									>
										Essays
									</button>
									<button 
										onclick={() => activeTab = 'tests'}
										class="px-4 py-2 text-sm font-medium border-b-2 {activeTab === 'tests' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'} transition-colors"
									>
										Tests & Transcripts
									</button>
									<button 
										onclick={() => activeTab = 'recommendations'}
										class="px-4 py-2 text-sm font-medium border-b-2 {activeTab === 'recommendations' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'} transition-colors"
									>
										Recommendations
									</button>
									<button 
										onclick={() => activeTab = 'forms'}
										class="px-4 py-2 text-sm font-medium border-b-2 {activeTab === 'forms' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'} transition-colors"
									>
										Rest of Form
									</button>
								</div>
								<button 
									onclick={() => hideCompleted = !hideCompleted}
									class="px-3 py-1 text-xs bg-transparent text-black border border-black rounded hover:bg-gray-100 transition-colors"
								>
									{hideCompleted ? 'Show All' : 'Hide Completed'}
								</button>
							</div>
						</div>
						
						
						{#if filteredTasks().length > 0}
							<div class="flex-1 overflow-y-auto" style="scrollbar-width: thin; scrollbar-color: #d1d5db #f3f4f6;">
								<div class="space-y-2 pb-20">
									{#each filteredTasks() as task, index}
										<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-gray-500 {task.status === 'completed' ? 'opacity-60' : ''}">
											<div class="flex items-center space-x-3 flex-1 min-w-0">
												{#if task.status === 'completed'}
													<!-- Completed Task - Clickable to uncomplete -->
													<form method="POST" action="?/uncompleteTask" class="flex-shrink-0">
														<input type="hidden" name="taskId" value={task.id} />
														<button 
															type="submit" 
															class="w-4 h-4 bg-green-500 rounded flex items-center justify-center hover:bg-green-600 transition-colors"
															title="Mark as pending"
															aria-label="Mark as pending"
														>
															<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
																<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
															</svg>
														</button>
													</form>
												{:else}
													<!-- Pending Task - Show checkbox -->
													<form method="POST" action="?/completeTask" class="flex-shrink-0">
														<input type="hidden" name="taskId" value={task.id} />
														<button 
															type="submit" 
															class="w-4 h-4 border border-gray-300 rounded hover:bg-green-100 hover:border-green-400 transition-colors flex items-center justify-center"
															title="Mark as complete"
															aria-label="Mark as complete"
														>
															<svg class="w-3 h-3 text-green-600 opacity-0 hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
																<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
															</svg>
														</button>
													</form>
												{/if}
												<div class="text-xs text-gray-500">#{task.globalOrder || index + 1}</div>
												<div class="flex-1 min-w-0 cursor-move">
													<div class="flex items-center gap-2">
														<div class="text-sm font-medium truncate {task.status === 'completed' ? 'line-through' : ''}">{task.title}</div>
														<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded shrink-0">{task.taskType?.type}</span>
													</div>
													<div class="text-xs text-gray-600 truncate {task.status === 'completed' ? 'line-through' : ''}">{task.schoolName}</div>
												</div>
											</div>
											<div class="flex items-center space-x-2">
												<div class="text-xs text-gray-500">
													{task.taskType?.type === 'notification' ? 'Reminder' : `${task.timeEstimate || 0}h`}
												</div>
												<a 
													href="/plan/{task.applicationId}?highlight={task.id}" 
													class="text-xs text-gray-600 hover:text-gray-800 underline"
													title="Edit this task"
												>
													Edit
												</a>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<div class="text-sm text-gray-500 text-center py-8">
								{#if activeTab === 'essays'}
									No essay tasks found
								{:else if activeTab === 'tests'}
									No test or transcript tasks found
								{:else if activeTab === 'recommendations'}
									No recommendation tasks found
								{:else if activeTab === 'forms'}
									No form tasks found
								{:else}
									No tasks found
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Right Side: Content Area (2/5 width) -->
				<div class="lg:col-span-2">
					<!-- Progress Rings Section -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
						<!-- Essays Progress Ring -->
						<div class="bg-white rounded-lg shadow-md p-4 text-center">
							<h3 class="text-md font-semibold mb-3">Essays Progress</h3>
							<div class="relative w-20 h-20 mx-auto mb-3">
								<svg class="w-20 h-20 transform -rotate-90">
									<!-- Background circle -->
									<circle
										cx="40"
										cy="40"
										r="35"
										stroke="#e5e7eb"
										stroke-width="6"
										fill="none"
									/>
									<!-- Progress circle -->
									<circle
										cx="40"
										cy="40"
										r="35"
										stroke="#10b981"
										stroke-width="6"
										fill="none"
										stroke-dasharray={getProgressRingPath(data.overallProgress.essayHours?.percentage || 0, 35).strokeDasharray}
										stroke-dashoffset={getProgressRingPath(data.overallProgress.essayHours?.percentage || 0, 35).strokeDashoffset}
										stroke-linecap="round"
										class="transition-all duration-500"
									/>
								</svg>
								<!-- Progress hours text -->
								<div class="absolute inset-0 flex items-center justify-center">
									<div class="text-center">
										<div class="text-sm font-bold text-gray-800">{data.overallProgress.essayHours?.completed || 0}h</div>
										<div class="text-xs text-gray-600">of {data.overallProgress.essayHours?.total || 0}h</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Overall Progress Ring (Concentric) -->
						<div class="bg-white rounded-lg shadow-md p-4 text-center">
							<h3 class="text-md font-semibold mb-3">Overall Progress</h3>
							<div class="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
								<!-- Time Percentage outside ring -->
								<div class="absolute -right-8 top-1 text-sm font-bold text-black">
									{getTimeProgressPercentage()}%
								</div>
								<svg class="w-20 h-20 transform -rotate-90">
									<!-- Outer ring background (Time) -->
									<circle
										cx="40"
										cy="40"
										r="35"
										stroke="#e5e7eb"
										stroke-width="5"
										fill="none"
									/>
									<!-- Outer ring progress (Time) -->
									<circle
										cx="40"
										cy="40"
										r="35"
										stroke="#10b981"
										stroke-width="5"
										fill="none"
										stroke-dasharray={getProgressRingPath(getTimeProgressPercentage(), 35).strokeDasharray}
										stroke-dashoffset={getProgressRingPath(getTimeProgressPercentage(), 35).strokeDashoffset}
										stroke-linecap="round"
										class="transition-all duration-500"
									/>
									
									<!-- Inner ring background (Tasks) -->
									<circle
										cx="40"
										cy="40"
										r="25"
										stroke="#f3f4f6"
										stroke-width="4"
										fill="none"
									/>
									<!-- Inner ring progress (Tasks) -->
									<circle
										cx="40"
										cy="40"
										r="25"
										stroke="#10b981"
										stroke-width="4"
										fill="none"
										stroke-dasharray={getProgressRingPath(getTaskProgressPercentage(), 25).strokeDasharray}
										stroke-dashoffset={getProgressRingPath(getTaskProgressPercentage(), 25).strokeDashoffset}
										stroke-linecap="round"
										class="transition-all duration-500"
									/>
								</svg>
								<!-- Center text -->
								<div class="absolute inset-0 flex items-center justify-center">
									<div class="text-center">
										<div class="text-sm font-bold text-gray-800">
											{getTaskProgressPercentage()}%
										</div>
									</div>
								</div>
							</div>
							<!-- Remaining Time and Tasks -->
							<div class="grid grid-cols-2 gap-4">
								<div>
									<h5 class="text-sm font-semibold mb-1 text-gray-800">Remaining Time:</h5>
									<div class="text-xl font-bold text-red-600">
										{getRemainingTime()} hours
									</div>
								</div>
								
								<div>
									<h5 class="text-sm font-semibold mb-1 text-gray-800">Remaining Tasks:</h5>
									<div class="text-xl font-bold text-orange-600">
										{getRemainingTasks()} tasks
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Horizontal Scrolling Week Calendar -->
					<div class="bg-white rounded-lg shadow-md p-6 mb-4">
						<h3 class="text-xl font-semibold mb-4">Weekly Plan</h3>
						
						{#if data.weeklyPlan && data.weeklyPlan.length > 0}
							<!-- Navigation Arrows and Scrolling Container -->
							<div class="relative">
								<!-- Left Arrow -->
								<button 
									onclick={() => scrollCalendar('left')}
									class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
									aria-label="Scroll left"
								>
									<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
									</svg>
								</button>
								
								<!-- Right Arrow -->
								<button 
									onclick={() => scrollCalendar('right')}
									class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
									aria-label="Scroll right"
								>
									<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
								
								<!-- Scrolling Container (hide scrollbar) -->
								<div 
									bind:this={calendarContainer}
									class="calendar-container overflow-x-auto pb-4 mx-8"
									style="scrollbar-width: none; -ms-overflow-style: none;"
								>
									<div class="flex space-x-4 min-w-max">
									{#each data.weeklyPlan as week, index}
										{@const weekStart = new Date(week.startDate)}
										{@const weekEnd = new Date(week.endDate)}
										{@const isCurrentWeek = data.currentWeekTasks.length > 0 && index === 0}
										
										<div class="flex-shrink-0 w-80 border rounded-lg p-4 {isCurrentWeek ? 'border-gray-800 bg-gray-100' : 'border-gray-200'}">
											<!-- Week Header -->
											<div class="flex justify-between items-center mb-3">
												<div>
													<h4 class="font-semibold text-sm text-gray-800">
														Week {week.weekNumber}
													</h4>
													<div class="text-xs text-gray-600">
														{weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
														{weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
													</div>
												</div>
												<div class="text-right">
													<div class="text-sm font-medium text-gray-800">
														{week.totalHours.toFixed(1)}h
													</div>
													<div class="text-xs text-gray-600">
														{(week.tasks || []).length} tasks
													</div>
												</div>
											</div>

											<!-- Work Tasks -->
											{#if week.tasks && week.tasks.length > 0}
												<div class="mb-3">
													<h5 class="text-xs font-medium text-gray-700 mb-2">Work Tasks</h5>
													<div class="space-y-1 max-h-40 overflow-y-auto">
														{#each week.tasks as task}
															<div class="text-xs p-2 bg-white rounded border-l-2 border-gray-500">
																<div class="flex items-center gap-1.5">
																	<div class="font-medium truncate flex-1">{task.title}</div>
																	<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded shrink-0">{task.taskType?.type}</span>
																</div>
																<div class="text-gray-600 truncate">{task.schoolName}</div>
																<div class="text-gray-500">{task.timeEstimate || 0}h • Due {new Date(task.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
															</div>
														{/each}
													</div>
												</div>
											{/if}

											<!-- Empty State -->
											{#if (!week.tasks || week.tasks.length === 0)}
												<div class="text-xs text-gray-500 text-center py-8">
													No tasks scheduled
												</div>
											{/if}
										</div>
									{/each}
									</div>
								</div>
							</div>
							
							<!-- Summary Stats -->
							<div class="mt-4 pt-4 border-t border-gray-200">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-center text-sm">
									<div>
										<div class="font-bold text-gray-800">{data.weeklyPlan.length}</div>
										<div class="text-xs text-gray-600">Weeks</div>
									</div>
									<div>
										<div class="font-bold text-orange-600">
											{Math.ceil(data.totalWorkTime / data.weeklyPlan.length)}h
										</div>
										<div class="text-xs text-gray-600">Avg/Week</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="text-center py-8 text-gray-500">
								<p>No weekly plan available</p>
							</div>
						{/if}
					</div>

				</div>
			</div>
		{/if}
	</main>
</div>