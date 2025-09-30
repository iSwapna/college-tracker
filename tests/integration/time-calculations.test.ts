import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, resetDatabase, getTestPrisma } from '../setup';
import {
  calculateUserTimeNeeded,
  calculateWeeklyPlan,
  createApplication,
  updateTaskStatus
} from '../../src/lib/prisma';

describe('Time Calculations', () => {
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

  describe('calculateUserTimeNeeded', () => {
    it('should calculate total time for pending tasks', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14); // 2 weeks from now

      await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
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
          },
          {
            title: 'Review',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 3
          }
        ]
      });

      const result = await calculateUserTimeNeeded(testUserId);

      expect(result.totalTime).toBe(5); // 2 + 1 + 2
      expect(result.remainingTasks).toBe(3);
      expect(result.weeksUntilDeadline).toBe(2);
      expect(result.weeklyTime).toBe(3); // ceil(5 / 2)
      expect(result.weeklyTimeWithBuffer).toBe(4); // ceil(3 * 1.3)
    });

    it('should exclude completed tasks from time calculation', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'MIT',
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

      const result = await calculateUserTimeNeeded(testUserId);

      expect(result.totalTime).toBe(1); // Only the final essay (1 hour)
      expect(result.remainingTasks).toBe(1);
    });

    it('should handle multiple applications with different deadlines', async () => {
      const deadline1 = new Date();
      deadline1.setDate(deadline1.getDate() + 7); // 1 week

      const deadline2 = new Date();
      deadline2.setDate(deadline2.getDate() + 21); // 3 weeks

      await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline: deadline1,
        tasks: [
          {
            title: 'Essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          }
        ]
      });

      await createApplication({
        userId: testUserId,
        schoolName: 'MIT',
        deadline: deadline2,
        tasks: [
          {
            title: 'Essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 1
          }
        ]
      });

      const result = await calculateUserTimeNeeded(testUserId);

      expect(result.totalTime).toBe(5); // 2 + 3
      expect(result.remainingTasks).toBe(2);
      expect(result.weeksUntilDeadline).toBe(1); // Based on earliest deadline
    });

    it('should return zero values when no applications exist', async () => {
      const result = await calculateUserTimeNeeded(testUserId);

      expect(result.totalTime).toBe(0);
      expect(result.weeklyTime).toBe(0);
      expect(result.weeklyTimeWithBuffer).toBe(0);
      expect(result.remainingTasks).toBe(0);
      expect(result.weeksUntilDeadline).toBe(0);
    });
  });

  describe('calculateWeeklyPlan - Overall time and task counts', () => {
    it('should calculate total work time with 10% buffer', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 10,
            globalOrder: 1
          }
        ]
      });

      const result = await calculateWeeklyPlan(testUserId);

      expect(result.actualWorkTime).toBe(10); // Actual pending time
      expect(result.totalWorkTime).toBe(11); // 10 * 1.1 buffer
    });

    it('should count remaining tasks correctly', async () => {
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

      // Mark one task as completed
      await updateTaskStatus(application.tasks[0].id, 'completed');

      const result = await calculateWeeklyPlan(testUserId);

      // Should have 2 remaining work tasks in the plan
      const totalTasksInPlan = result.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );
      expect(totalTasksInPlan).toBe(2);
    });

    it('should distribute work across available weeks', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14); // 2 weeks

      await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
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

      const result = await calculateWeeklyPlan(testUserId);

      expect(result.weeklyPlan.length).toBeGreaterThan(0);

      const totalPlannedHours = result.weeklyPlan.reduce(
        (sum, week) => sum + week.totalHours,
        0
      );

      // Should include all pending work (actual task times, not buffered)
      expect(totalPlannedHours).toBe(6); // 3+2+1
    });
  });

  describe('calculateWeeklyPlan - Essay calculations', () => {
    it('should calculate essay hours completed and total', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline,
        tasks: [
          {
            title: 'Essay 1 Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Essay 1 Final',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1,
            globalOrder: 2
          },
          {
            title: 'Essay 2 Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 3
          },
          {
            title: 'Essay 2 Final',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1.5,
            globalOrder: 4
          }
        ]
      });

      // Complete first essay draft (2 hours)
      await updateTaskStatus(application.tasks[0].id, 'completed');

      const result = await calculateWeeklyPlan(testUserId);

      expect(result.overallProgress.essayHours.total).toBe(7.5); // 2 + 1 + 3 + 1.5
      expect(result.overallProgress.essayHours.completed).toBe(2);
      expect(result.overallProgress.essayHours.percentage).toBe(27); // round(2/7.5 * 100)
    });

    it('should calculate essay task count percentage', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Harvard',
        deadline,
        tasks: [
          {
            title: 'Essay 1 Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Essay 1 Final',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1,
            globalOrder: 2
          },
          {
            title: 'Essay 2 Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 3
          },
          {
            title: 'Essay 2 Final',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 1.5,
            globalOrder: 4
          }
        ]
      });

      // Complete 1 out of 4 essay tasks
      await updateTaskStatus(application.tasks[0].id, 'completed');

      const result = await calculateWeeklyPlan(testUserId);

      expect(result.overallProgress.essays).toBe(25); // 1/4 = 25%
    });

    it('should handle no essay tasks', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline,
        tasks: [
          {
            title: 'Review',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 1
          }
        ]
      });

      const result = await calculateWeeklyPlan(testUserId);

      expect(result.overallProgress.essays).toBe(0);
      expect(result.overallProgress.essayHours.total).toBe(0);
      expect(result.overallProgress.essayHours.completed).toBe(0);
      expect(result.overallProgress.essayHours.percentage).toBe(0);
    });
  });

  describe('calculateWeeklyPlan - Notification tracking', () => {
    it('should track notification tasks separately from work tasks', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Submit Application',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 2
          },
          {
            title: 'Check Portal',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 3
          }
        ]
      });

      const result = await calculateWeeklyPlan(testUserId);

      expect(result.totalNotifications).toBe(2);
      expect(result.overallProgress.notifications).toBe(0);

      // Notifications should not be in weekly plan
      const totalTasksInPlan = result.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );
      expect(totalTasksInPlan).toBe(1); // Only essay task
    });

    it('should calculate notification completion percentage', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline,
        tasks: [
          {
            title: 'Notification 1',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 1
          },
          {
            title: 'Notification 2',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 2
          },
          {
            title: 'Notification 3',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 3
          }
        ]
      });

      // Complete 2 out of 3 notifications
      await updateTaskStatus(application.tasks[0].id, 'completed');
      await updateTaskStatus(application.tasks[1].id, 'completed');

      const result = await calculateWeeklyPlan(testUserId);

      expect(result.overallProgress.notifications).toBe(67); // round(2/3 * 100)
    });
  });
});