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

	// Users are now created via Kinde authentication
	console.log('Database seeded successfully!');
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