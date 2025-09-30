import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, resetDatabase, getTestPrisma } from '../setup';
import {
  createApplication,
  updateTaskStatus,
  getUserApplicationsWithProgress,
  calculateUserTimeNeeded
} from '../../src/lib/prisma';

describe('Task Status Management', () => {
  let testUserId: string;
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
    const prisma = getTestPrisma();

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });
    testUserId = user.id;
  });

  describe('Marking tasks as completed', () => {
    it('should mark a task as completed and set completedAt timestamp', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          }
        ]
      });

      const taskId = application.tasks[0].id;

      await updateTaskStatus(taskId, 'completed');

      const prisma = getTestPrisma();
      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      expect(updatedTask?.status).toBe('completed');
      expect(updatedTask?.completedAt).toBeInstanceOf(Date);
      expect(updatedTask?.completedAt).not.toBeNull();
    });

    it('should exclude completed tasks from time calculations', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'MIT',
        deadline,
        tasks: [
          {
            title: 'Task 1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 1
          },
          {
            title: 'Task 2',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 2,
            globalOrder: 2
          },
          {
            title: 'Task 3',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 3
          }
        ]
      });

      // Initially all tasks are pending
      const initialCalc = await calculateUserTimeNeeded(testUserId);
      expect(initialCalc.totalTime).toBe(6); // 3 + 2 + 1
      expect(initialCalc.remainingTasks).toBe(3);

      // Mark first task as completed
      await updateTaskStatus(application.tasks[0].id, 'completed');

      const afterFirstComplete = await calculateUserTimeNeeded(testUserId);
      expect(afterFirstComplete.totalTime).toBe(3); // 2 + 1 (task 1 excluded)
      expect(afterFirstComplete.remainingTasks).toBe(2);

      // Mark second task as completed
      await updateTaskStatus(application.tasks[1].id, 'completed');

      const afterSecondComplete = await calculateUserTimeNeeded(testUserId);
      expect(afterSecondComplete.totalTime).toBe(1); // Only task 3
      expect(afterSecondComplete.remainingTasks).toBe(1);
    });
  });

  describe('Marking tasks as pending (reverting completion)', () => {
    it('should mark a completed task back to pending and clear completedAt', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Harvard',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          }
        ]
      });

      const taskId = application.tasks[0].id;

      // Mark as completed
      await updateTaskStatus(taskId, 'completed');

      const prisma = getTestPrisma();
      let task = await prisma.task.findUnique({ where: { id: taskId } });
      expect(task?.status).toBe('completed');
      expect(task?.completedAt).not.toBeNull();

      // Mark back to pending
      await updateTaskStatus(taskId, 'pending');

      task = await prisma.task.findUnique({ where: { id: taskId } });
      expect(task?.status).toBe('pending');
      expect(task?.completedAt).toBeNull();
    });

    it('should include reverted tasks in time calculations', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Yale',
        deadline,
        tasks: [
          {
            title: 'Task 1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 5,
            globalOrder: 1
          },
          {
            title: 'Task 2',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 3,
            globalOrder: 2
          }
        ]
      });

      // Mark first task as completed
      await updateTaskStatus(application.tasks[0].id, 'completed');

      let calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(3); // Only task 2
      expect(calc.remainingTasks).toBe(1);

      // Revert first task back to pending
      await updateTaskStatus(application.tasks[0].id, 'pending');

      calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(8); // Both tasks (5 + 3)
      expect(calc.remainingTasks).toBe(2);
    });
  });

  describe('Complex status management scenarios', () => {
    it('should handle multiple tasks being completed and reverted', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Princeton',
        deadline,
        tasks: [
          {
            title: 'Task 1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Task 2',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1,
            globalOrder: 2
          },
          {
            title: 'Task 3',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 3
          }
        ]
      });

      // Complete all tasks
      await updateTaskStatus(application.tasks[0].id, 'completed');
      await updateTaskStatus(application.tasks[1].id, 'completed');
      await updateTaskStatus(application.tasks[2].id, 'completed');

      let calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(0);
      expect(calc.remainingTasks).toBe(0);

      // Revert middle task
      await updateTaskStatus(application.tasks[1].id, 'pending');

      calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(1);
      expect(calc.remainingTasks).toBe(1);

      // Revert first task
      await updateTaskStatus(application.tasks[0].id, 'pending');

      calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(3); // Task 1 + Task 2
      expect(calc.remainingTasks).toBe(2);
    });

    it('should maintain correct state when adding new tasks to partially completed application', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Columbia',
        deadline,
        tasks: [
          {
            title: 'Task 1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Task 2',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1,
            globalOrder: 2
          }
        ]
      });

      // Complete first task
      await updateTaskStatus(application.tasks[0].id, 'completed');

      let calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(1); // Only task 2

      // Add a new task
      const prisma = getTestPrisma();
      await prisma.task.create({
        data: {
          applicationId: application.id,
          taskTypeId: taskTypeIds['timebox'],
          title: 'New Task',
          timeEstimate: 3,
          globalOrder: 3
        }
      });

      // Verify calculation includes new task but not completed task
      calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(4); // Task 2 (1) + New Task (3)
      expect(calc.remainingTasks).toBe(2);

      // Verify we can see all tasks with correct statuses
      const apps = await getUserApplicationsWithProgress(testUserId);
      expect(apps[0].tasks).toHaveLength(3);
      expect(apps[0].tasks[0].status).toBe('completed');
      expect(apps[0].tasks[1].status).toBe('pending');
      expect(apps[0].tasks[2].status).toBe('pending');
    });

    it('should handle status changes across multiple applications', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app1 = await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline,
        tasks: [
          {
            title: 'Stanford Essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 1
          }
        ]
      });

      const app2 = await createApplication({
        userId: testUserId,
        schoolName: 'MIT',
        deadline,
        tasks: [
          {
            title: 'MIT Essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 4,
            globalOrder: 1
          }
        ]
      });

      // Initially both pending
      let calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(7); // 3 + 4
      expect(calc.remainingTasks).toBe(2);

      // Complete one from each application
      await updateTaskStatus(app1.tasks[0].id, 'completed');

      calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(4); // Only MIT essay
      expect(calc.remainingTasks).toBe(1);

      // Revert Stanford, complete MIT
      await updateTaskStatus(app1.tasks[0].id, 'pending');
      await updateTaskStatus(app2.tasks[0].id, 'completed');

      calc = await calculateUserTimeNeeded(testUserId);
      expect(calc.totalTime).toBe(3); // Only Stanford essay
      expect(calc.remainingTasks).toBe(1);
    });
  });
});