import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== USERS ===');
  const users = await prisma.user.findMany();
  console.log(users);
  
  console.log('\n=== APPLICATIONS ===');
  const applications = await prisma.application.findMany({
    include: { tasks: true }
  });
  console.log(applications);
  
  console.log('\n=== TASK TYPES ===');
  const taskTypes = await prisma.taskType.findMany();
  console.log(taskTypes);
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });