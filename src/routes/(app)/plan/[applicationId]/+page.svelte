<script lang="ts">
	import PlanPage from '$lib/components/PlanPage.svelte';
	import { page } from '$app/stores';

	let { data }: { 
		data: {
			application: any;
			taskTypes: Array<{id: string, type: string, defaultTime: number | null}>;
		}
	} = $props();
</script>

<PlanPage 
	application={data.application}
	taskTypes={data.taskTypes || []}
	form={$page.form}
/>