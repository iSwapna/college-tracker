export interface SavedApplication {
	id: string;
	school_name: string;
	program_id: string;
	status: string;
	created_at: string;
	deadline: string;
	tasks?: {
		title: string;
		status: boolean;
		time_estimate?: number;
	}[];
}