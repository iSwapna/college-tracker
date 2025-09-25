<script lang="ts">
	import SchoolPage, { type SavedApplication } from '$lib/components/SchoolPage.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';


	let { data }: { data: PageData } = $props();
	
	let savedApplications = $state<SavedApplication[]>(data.savedApplications);
	let showAddForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deleteTarget = $state<{ name: string; type: 'selected' | 'saved' } | null>(null);
	let newSchoolName = $state('');
	let newSchoolDeadline = $state('');
	let newSchoolUrl = $state('');



	function toggleAddForm() {
		showAddForm = !showAddForm;
		if (!showAddForm) {
			// Clear form when closing
			newSchoolName = '';
			newSchoolDeadline = '';
			newSchoolUrl = '';
		}
	}

	function updateNewSchoolName(value: string) {
		newSchoolName = value;
	}

	function updateNewSchoolDeadline(value: string) {
		newSchoolDeadline = value;
	}

	function updateNewSchoolUrl(value: string) {
		newSchoolUrl = value;
	}

	function addSchool() {
		if (!newSchoolName.trim()) return;
		
		// Check if school already exists
		if (isSchoolSaved(newSchoolName.trim())) {
			alert('School already added!');
			return;
		}
		
		// Create new application entry
		const newApplication: SavedApplication = {
			id: crypto.randomUUID(),
			school_name: newSchoolName.trim(),
			program_id: newSchoolName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
			status: 'not_started',
			created_at: new Date().toISOString(),
			deadline: newSchoolDeadline || new Date().toISOString(),
			tasks: [] // No tasks initially
		};
		
		// Add to the list
		savedApplications = [...savedApplications, newApplication];
		
		// TODO: Also save to database
		
		// Close form and clear inputs
		toggleAddForm();
	}

	function isSchoolSaved(schoolName: string): boolean {
		return savedApplications.some(app => app.school_name === schoolName);
	}

	function getSavedApplication(schoolName: string): SavedApplication | undefined {
		return savedApplications.find(app => app.school_name === schoolName);
	}

	function getApplicationProgress(app: SavedApplication): { completed: number; total: number; percentage: number } {
		if (!app.tasks || app.tasks.length === 0) {
			return { completed: 0, total: 0, percentage: 0 };
		}
		
		const completed = app.tasks.filter(task => task.status).length;
		const total = app.tasks.length;
		const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
		
		return { completed, total, percentage };
	}

	function getOverallTimeSummary(): { totalTime: number; remainingTasks: number; hasIncompleteTasks: boolean; completedTasks: number; totalTasks: number; percentage: number } {
		let totalTime = 0;
		let remainingTasks = 0;
		let completedTasks = 0;
		let totalTasks = 0;
		let hasIncompleteTasks = false;

		savedApplications.forEach(app => {
			if (app.tasks && app.tasks.length > 0) {
				app.tasks.forEach(task => {
					totalTasks++;
					if (!task.status) {
						remainingTasks++;
						hasIncompleteTasks = true;
						if (task.time_estimate && task.time_estimate > 0) {
							totalTime += task.time_estimate;
						}
					} else {
						completedTasks++;
					}
				});
			}
		});

		const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
		return { totalTime, remainingTasks, hasIncompleteTasks, completedTasks, totalTasks, percentage };
	}

	function makePlan(schoolName: string) {
		// TODO: Create application in database first, then navigate to plan
		const programId = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-');
		goto(`/plan/${programId}?school=${encodeURIComponent(schoolName)}`);
	}

	function editPlan(schoolName: string) {
		const savedApp = getSavedApplication(schoolName);
		if (savedApp) {
			goto(`/plan/${savedApp.program_id}?school=${encodeURIComponent(schoolName)}`);
		}
	}

	function confirmDelete(schoolName: string) {
		deleteTarget = { name: schoolName, type: 'saved' };
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		deleteTarget = null;
	}

	function confirmDeleteAction() {
		if (!deleteTarget) return;

		const { name: schoolName } = deleteTarget;

		// Remove from saved applications
		savedApplications = savedApplications.filter(app => app.school_name !== schoolName);
		// TODO: Also delete from database

		showDeleteConfirm = false;
		deleteTarget = null;
	}

</script>

<SchoolPage 
	{savedApplications}
	{showAddForm}
	{showDeleteConfirm}
	{deleteTarget}
	{newSchoolName}
	{newSchoolDeadline}
	{newSchoolUrl}
	{addSchool}
	{toggleAddForm}
	{updateNewSchoolName}
	{updateNewSchoolDeadline}
	{updateNewSchoolUrl}
	{getOverallTimeSummary}
	{getApplicationProgress}
	{makePlan}
	{editPlan}
	{confirmDelete}
	{cancelDelete}
	{confirmDeleteAction}
/>
