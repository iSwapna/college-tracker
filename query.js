import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== USERS ===');
  const users = await prisma.user.findMany();
  console.log(users);
  
  console.log('\n=== APPLICATIONS ===');
  const applications = await prisma.application.findMany({
    include: { 
      tasks: {
        include: {
          taskType: true
        },
        orderBy: [
          { order: 'asc' },
          { globalOrder: 'asc' }
        ]
      }
    }
  });
  
  applications.forEach(app => {
    console.log(`\n${app.schoolName} (${app.status})`);
    console.log(`   Deadline: ${app.deadline.toLocaleDateString()}`);
    console.log(`   Tasks (${app.tasks.length}):`);
    
    if (app.tasks.length > 0) {
      app.tasks.forEach(task => {
        console.log(`     ${task.order || '∞'}) ${task.title}`);
        console.log(`        Type: ${task.taskType?.type || 'unknown'}`);
        console.log(`        Time: ${task.timeEstimate || 0}h`);
        console.log(`        Status: ${task.status}`);
        if (task.description) console.log(`        Desc: ${task.description}`);
      });
    } else {
      console.log('     (no tasks)');
    }
  });
  
  console.log('\n=== ALL TASKS ===');
  const allTasks = await prisma.task.findMany({
    include: {
      taskType: true,
      application: true
    },
    orderBy: [
      { globalOrder: 'asc' }
    ]
  });
  
  allTasks.forEach(task => {
    console.log(`${task.globalOrder || '∞'}) ${task.title} (${task.application.schoolName})`);
    console.log(`   Type: ${task.taskType?.type}, Time: ${task.timeEstimate}h, Status: ${task.status}`);
    if (task.description) console.log(`   Desc: ${task.description}`);
  });
  
  console.log('\n=== TASK TYPES ===');
  const taskTypes = await prisma.taskType.findMany();
  taskTypes.forEach(type => {
    console.log(`${type.type}: ${type.defaultTime}h default`);
  });
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });