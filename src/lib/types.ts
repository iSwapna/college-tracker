export interface SavedApplication {
	id: string;
	school_name: string;
	program_id: string;
	status: string;
	deadline: string;
	tasks?: {
		title: string;
		description?: string;
		status: boolean;
		time_estimate?: number;
		order?: number;
	}[];
}