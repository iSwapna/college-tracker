
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export async function setupTestDatabase() {
  // Use existing PostgreSQL database for tests
  // In a real setup, you'd use a separate test database
  prisma = new PrismaClient();

  await prisma.$connect();

  // Seed task types
  await seedTaskTypes();

  return prisma;
}

export async function cleanupTestDatabase() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

export async function resetDatabase() {
  if (!prisma) return;

  // Delete all records in reverse order to handle foreign keys
  await prisma.task.deleteMany();
  await prisma.application.deleteMany();
  await prisma.user.deleteMany();

  // Re-seed task types
  await seedTaskTypes();
}

async function seedTaskTypes() {
  if (!prisma) return;

  const taskTypes = [
    { type: 'essay-draft', defaultTime: 2 },
    { type: 'essay-final', defaultTime: 1 },
    { type: 'timebox', defaultTime: 2 },
    { type: 'notification', defaultTime: null }
  ];

  for (const taskType of taskTypes) {
    await prisma.taskType.upsert({
      where: { type: taskType.type },
      update: {},
      create: taskType
    });
  }
}

export function getTestPrisma() {
  return prisma;
}

// Helper to create test users with required fields
export async function createTestUser(email: string, name: string = 'Test User', kindeId?: string) {
  return await prisma.user.create({
    data: {
      email,
      name,
      kindeId: kindeId || `test-kinde-${Date.now()}-${Math.random()}`,
      username: email
    }
  });
}