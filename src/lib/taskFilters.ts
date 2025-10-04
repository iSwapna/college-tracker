export function filterTasksByTab(tasks: any[], activeTab: string): any[] {
	switch(activeTab) {
		case 'essays':
			return tasks.filter((task: any) =>
				task.taskType?.type === 'essay-draft' || task.taskType?.type === 'essay-final'
			);
		case 'tests':
			return tasks.filter((task: any) =>
				task.title?.toLowerCase().includes('test') ||
				task.title?.toLowerCase().includes('transcript')
			);
		case 'recommendations':
			return tasks.filter((task: any) =>
				task.title?.toLowerCase().includes('recommendation') ||
				task.title?.toLowerCase().includes('reference')
			);
		case 'forms':
		default:
			// Everything else goes to "Rest of Form"
			return tasks.filter((task: any) => {
				const isEssay = task.taskType?.type === 'essay-draft' || task.taskType?.type === 'essay-final';
				const isTest = task.title?.toLowerCase().includes('test') ||
					task.title?.toLowerCase().includes('transcript');
				const isRec = task.title?.toLowerCase().includes('recommendation') ||
					task.title?.toLowerCase().includes('reference');

				return !isEssay && !isTest && !isRec;
			});
	}
}
