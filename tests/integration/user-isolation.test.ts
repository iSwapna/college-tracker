import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, resetDatabase, getTestPrisma, createTestUser } from '../setup';
import {
  getUserApplicationsWithProgress,
  createApplication,
  getApplicationWithTasks,
  deleteApplication
} from '../../src/lib/prisma';

describe('User Data Isolation', () => {
  let user1Id: string;
  let user2Id: string;
  let taskTypeIds: Record<string, string>;

  beforeAll(async () => {
    await setupTestDatabase();
    const prisma = getTestPrisma();

    const taskTypes = await prisma.taskType.findMany();
    taskTypeIds = taskTypes.reduce((acc, tt) => {
      acc[tt.type] = tt.id;
      return acc;
    }, {} as Record<string, string>);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();

    // Create two separate users
    const user1 = await createTestUser('user1@example.com', 'User One');
    const user2 = await createTestUser('user2@example.com', 'User Two');

    user1Id = user1.id;
    user2Id = user2.id;
  });

  it('should isolate applications between users', async () => {
    // User 1 creates an application
    const app1 = await createApplication({
      userId: user1Id,
      schoolName: 'User 1 School',
      deadline: new Date(),
      tasks: []
    });

    // User 2 creates an application
    const app2 = await createApplication({
      userId: user2Id,
      schoolName: 'User 2 School',
      deadline: new Date(),
      tasks: []
    });

    // User 1 should only see their application
    const user1Apps = await getUserApplicationsWithProgress(user1Id);
    expect(user1Apps).toHaveLength(1);
    expect(user1Apps[0].schoolName).toBe('User 1 School');

    // User 2 should only see their application
    const user2Apps = await getUserApplicationsWithProgress(user2Id);
    expect(user2Apps).toHaveLength(1);
    expect(user2Apps[0].schoolName).toBe('User 2 School');
  });

  it('should prevent user from accessing another user\'s application', async () => {
    // User 1 creates an application
    const app1 = await createApplication({
      userId: user1Id,
      schoolName: 'User 1 School',
      deadline: new Date(),
      tasks: []
    });

    // User 2 tries to access User 1's application
    const result = await getApplicationWithTasks(app1.id, user2Id);

    // Should return null (not found) since user 2 doesn't own it
    expect(result).toBeNull();
  });

  it('should prevent user from deleting another user\'s application', async () => {
    // User 1 creates an application
    const app1 = await createApplication({
      userId: user1Id,
      schoolName: 'User 1 School',
      deadline: new Date(),
      tasks: []
    });

    // User 2 tries to delete User 1's application
    const deleteResult = await deleteApplication(app1.id, user2Id);

    // Should not delete anything (count = 0)
    expect(deleteResult.count).toBe(0);

    // Verify User 1's application still exists
    const user1Apps = await getUserApplicationsWithProgress(user1Id);
    expect(user1Apps).toHaveLength(1);
  });

  it('should handle multiple applications per user correctly', async () => {
    // User 1 creates multiple applications
    await createApplication({
      userId: user1Id,
      schoolName: 'School A',
      deadline: new Date(),
      tasks: []
    });

    await createApplication({
      userId: user1Id,
      schoolName: 'School B',
      deadline: new Date(),
      tasks: []
    });

    // User 2 creates one application
    await createApplication({
      userId: user2Id,
      schoolName: 'School C',
      deadline: new Date(),
      tasks: []
    });

    // Verify each user sees only their applications
    const user1Apps = await getUserApplicationsWithProgress(user1Id);
    expect(user1Apps).toHaveLength(2);
    expect(user1Apps.map(a => a.schoolName).sort()).toEqual(['School A', 'School B']);

    const user2Apps = await getUserApplicationsWithProgress(user2Id);
    expect(user2Apps).toHaveLength(1);
    expect(user2Apps[0].schoolName).toBe('School C');
  });
});
