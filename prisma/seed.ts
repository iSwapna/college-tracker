import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	// Create task types
	const taskTypes = await Promise.all([
		prisma.taskType.upsert({
			where: { type: 'essay-draft' },
			update: {},
			create: {
				type: 'essay-draft',
				defaultTime: 2
			}
		}),
		prisma.taskType.upsert({
			where: { type: 'essay-final' },
			update: {},
			create: {
				type: 'essay-final', 
				defaultTime: 1
			}
		}),
		prisma.taskType.upsert({
			where: { type: 'timebox' },
			update: {},
			create: {
				type: 'timebox',
				defaultTime: 2
			}
		}),
		prisma.taskType.upsert({
			where: { type: 'notification' },
			update: {},
			create: {
				type: 'notification',
				defaultTime: null
			}
		})
	]);

	console.log('Created task types:', taskTypes);

	// Create sample programs
	const programs = await Promise.all([
		prisma.program.upsert({
			where: { id: 'sample-program-1' },
			update: {},
			create: {
				id: 'sample-program-1',
				programName: 'Computer Science MS',
				deadline: new Date('2025-01-15'),
				website: 'https://example.edu/cs-ms'
			}
		}),
		prisma.program.upsert({
			where: { id: 'sample-program-2' },
			update: {},
			create: {
				id: 'sample-program-2',
				programName: 'MBA',
				deadline: new Date('2025-02-01'),
				website: 'https://example.edu/mba'
			}
		})
	]);

	console.log('Created programs:', programs);

	// Create a sample user
	const user = await prisma.user.upsert({
		where: { email: 'demo@example.com' },
		update: {},
		create: {
			email: 'demo@example.com',
			name: 'Demo User'
		}
	});

	console.log('Created user:', user);

	// Create sample applications
	const application1 = await prisma.application.upsert({
		where: { id: 'sample-app-1' },
		update: {},
		create: {
			id: 'sample-app-1',
			userId: user.id,
			programId: programs[0].id,
			schoolName: 'Stanford University',
			deadline: new Date('2025-01-15')
		}
	});

	const application2 = await prisma.application.upsert({
		where: { id: 'sample-app-2' },
		update: {},
		create: {
			id: 'sample-app-2',
			userId: user.id,
			programId: programs[1].id,
			schoolName: 'MIT Sloan',
			deadline: new Date('2025-02-01')
		}
	});

	console.log('Created applications:', [application1, application2]);

	// Create sample tasks
	const tasks = await Promise.all([
		// Stanford CS tasks
		prisma.task.create({
			data: {
				applicationId: application1.id,
				taskTypeId: taskTypes.find(t => t.type === 'essay-draft')!.id,
				title: 'Personal Statement Draft',
				description: 'Write first draft of personal statement',
				timeEstimate: 3,
				globalOrder: 1
			}
		}),
		prisma.task.create({
			data: {
				applicationId: application1.id,
				taskTypeId: taskTypes.find(t => t.type === 'notification')!.id,
				title: 'Request Transcripts',
				description: 'Order official transcripts from university',
				globalOrder: 2
			}
		}),
		prisma.task.create({
			data: {
				applicationId: application1.id,
				taskTypeId: taskTypes.find(t => t.type === 'timebox')!.id,
				title: 'Research Faculty',
				description: 'Research potential advisors and their work',
				timeEstimate: 2,
				globalOrder: 3
			}
		}),
		// MIT MBA tasks  
		prisma.task.create({
			data: {
				applicationId: application2.id,
				taskTypeId: taskTypes.find(t => t.type === 'essay-draft')!.id,
				title: 'Career Goals Essay Draft',
				description: 'Draft essay about career goals',
				timeEstimate: 4,
				globalOrder: 4
			}
		}),
		prisma.task.create({
			data: {
				applicationId: application2.id,
				taskTypeId: taskTypes.find(t => t.type === 'notification')!.id,
				title: 'Schedule GMAT',
				description: 'Register for GMAT test date',
				globalOrder: 5
			}
		})
	]);

	console.log('Created tasks:', tasks);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});