import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, resetDatabase, getTestPrisma, createTestUser } from '../setup';
import {
  getUserApplicationsWithProgress,
  calculateUserTimeNeeded,
  calculateWeeklyPlan,
  createApplication,
  updateTaskStatus,
  deleteApplication
} from '../../src/lib/prisma';

describe('Application Management Workflow', () => {
  let testUserId: string;
  let taskTypeIds: Record<string, string>;

  beforeAll(async () => {
    await setupTestDatabase();
    const prisma = getTestPrisma();

    // Get task type IDs
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

    // Create a test user
    const user = await createTestUser('test@example.com', 'Test User');
    testUserId = user.id;
  });

  describe('Creating and managing applications', () => {
    it('should create an application with tasks', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30); // 30 days from now

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Stanford University',
        deadline,
        url: 'https://apply.stanford.edu',
        tasks: [
          {
            title: 'Main Essay Draft',
            description: 'Write first draft of main essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Main Essay Final',
            description: 'Finalize main essay',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1,
            globalOrder: 2
          }
        ]
      });

      expect(application).toBeDefined();
      expect(application.schoolName).toBe('Stanford University');
      expect(application.tasks).toHaveLength(2);
      expect(application.tasks[0].title).toBe('Main Essay Draft');
      expect(application.tasks[0].timeEstimate).toBe(2);
    });

    it('should retrieve applications with progress', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);

      await createApplication({
        userId: testUserId,
        schoolName: 'MIT',
        deadline,
        tasks: [
          {
            title: 'Essay 1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          }
        ]
      });

      const applications = await getUserApplicationsWithProgress(testUserId);

      expect(applications).toHaveLength(1);
      expect(applications[0].schoolName).toBe('MIT');
      expect(applications[0].tasks).toHaveLength(1);
    });

    it('should delete an application and its tasks', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Harvard',
        deadline,
        tasks: [
          {
            title: 'Essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          }
        ]
      });

      await deleteApplication(application.id, testUserId);

      const applications = await getUserApplicationsWithProgress(testUserId);
      expect(applications).toHaveLength(0);

      const prisma = getTestPrisma();
      const tasks = await prisma.task.findMany({
        where: { applicationId: application.id }
      });
      expect(tasks).toHaveLength(0);
    });
  });

  describe('Adding tasks to existing application', () => {
    it('should add new tasks while some tasks are completed', async () => {
      const prisma = getTestPrisma();
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);

      // Create application with initial tasks
      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Yale',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Essay Final',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1,
            globalOrder: 2
          }
        ]
      });

      // Mark first task as completed
      await updateTaskStatus(application.tasks[0].id, 'completed');

      // Add a new task
      await prisma.task.create({
        data: {
          applicationId: application.id,
          taskTypeId: taskTypeIds['timebox'],
          title: 'Review Application',
          timeEstimate: 2,
          globalOrder: 3
        }
      });

      // Verify the state
      const updatedApplications = await getUserApplicationsWithProgress(testUserId);
      const app = updatedApplications[0];

      expect(app.tasks).toHaveLength(3);
      expect(app.tasks[0].status).toBe('completed');
      expect(app.tasks[1].status).toBe('pending');
      expect(app.tasks[2].status).toBe('pending');
      expect(app.tasks[2].title).toBe('Review Application');
    });
  });
});