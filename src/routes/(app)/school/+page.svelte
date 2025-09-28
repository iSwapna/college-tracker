<script lang="ts">
	import SchoolPage from '$lib/components/SchoolPage.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Parent only handles navigation
	function getSavedApplication(schoolName: string) {
		return data.savedApplications.find(app => app.school_name === schoolName);
	}

	function editPlan(schoolName: string) {
		const savedApp = getSavedApplication(schoolName);
		if (savedApp) {
			goto(`/plan/${savedApp.id}?school=${encodeURIComponent(schoolName)}`);
		}
	}
</script>

<SchoolPage 
	savedApplications={data.savedApplications}
	{editPlan}
/>
