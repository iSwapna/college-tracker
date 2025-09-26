<script lang="ts">
	import SchoolPage from '$lib/components/SchoolPage.svelte';
	import type { SavedApplication } from '$lib/types';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';


	let { data }: { data: PageData } = $props();
	
	let savedApplications = $state<SavedApplication[]>(data.savedApplications);
	let showAddForm = $state(false);
	let showDeleteConfirm = $state(false);
	let deleteTarget = $state<string | null>(null);
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


	async function addSchool() {
		if (!newSchoolName.trim()) return;
		
		// Create a form element and submit it
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/addSchool';
		
		// Add school name input
		const schoolNameInput = document.createElement('input');
		schoolNameInput.type = 'hidden';
		schoolNameInput.name = 'schoolName';
		schoolNameInput.value = newSchoolName.trim();
		form.appendChild(schoolNameInput);
		
		// Add deadline input
		const deadlineInput = document.createElement('input');
		deadlineInput.type = 'hidden';
		deadlineInput.name = 'deadline';
		deadlineInput.value = newSchoolDeadline || new Date().toISOString();
		form.appendChild(deadlineInput);
		
		// Add to page and submit
		document.body.appendChild(form);
		form.submit();
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


	function editPlan(schoolName: string) {
		const savedApp = getSavedApplication(schoolName);
		if (savedApp) {
			goto(`/plan/${savedApp.id}?school=${encodeURIComponent(schoolName)}`);
		}
	}

	function confirmDelete(schoolName: string) {
		deleteTarget = schoolName;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		deleteTarget = null;
	}

	function confirmDeleteAction() {
		if (!deleteTarget) return;

		// Remove from saved applications
		savedApplications = savedApplications.filter(app => app.school_name !== deleteTarget);
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
	{getOverallTimeSummary}
	{getApplicationProgress}
	{editPlan}
	{confirmDelete}
	{cancelDelete}
	{confirmDeleteAction}
/>
