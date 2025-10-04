import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, resetDatabase, getTestPrisma, createTestUser } from '../setup';
import {
  calculateWeeklyPlan,
  createApplication,
  updateTaskStatus
} from '../../src/lib/prisma';

describe('Sequential Filling Scheduling Algorithm', () => {
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

    const user = await createTestUser('test@example.com', 'Test User');
    testUserId = user.id;
  });

  describe('Tasks with different deadlines', () => {
    it('should schedule tasks with earlier deadlines before tasks with later deadlines', async () => {
      const deadline1 = new Date();
      deadline1.setDate(deadline1.getDate() + 7); // 1 week from now

      const deadline2 = new Date();
      deadline2.setDate(deadline2.getDate() + 28); // 4 weeks from now

      // Create application with later deadline first (to test sorting)
      await createApplication({
        userId: testUserId,
        schoolName: 'MIT',
        deadline: deadline2,
        tasks: [
          {
            title: 'MIT Essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 1
          }
        ]
      });

      // Create application with earlier deadline
      await createApplication({
        userId: testUserId,
        schoolName: 'Stanford',
        deadline: deadline1,
        tasks: [
          {
            title: 'Stanford Essay',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 2
          }
        ]
      });

      const result = await calculateWeeklyPlan(testUserId);

      // Find which week Stanford essay is in
      const stanfordWeek = result.weeklyPlan.find(week =>
        week.tasks.some(task => task.schoolName === 'Stanford')
      );

      // Find which week MIT essay is in
      const mitWeek = result.weeklyPlan.find(week =>
        week.tasks.some(task => task.schoolName === 'MIT')
      );

      expect(stanfordWeek).toBeDefined();
      expect(mitWeek).toBeDefined();

      // Stanford (earlier deadline) should be scheduled before or same week as MIT
      expect(stanfordWeek!.weekNumber).toBeLessThanOrEqual(mitWeek!.weekNumber);
    });

    it('should not schedule tasks after their deadline week', async () => {
      const deadline1 = new Date();
      deadline1.setDate(deadline1.getDate() + 7); // 1 week

      const deadline2 = new Date();
      deadline2.setDate(deadline2.getDate() + 14); // 2 weeks

      const deadline3 = new Date();
      deadline3.setDate(deadline3.getDate() + 21); // 3 weeks

      await createApplication({
        userId: testUserId,
        schoolName: 'School A',
        deadline: deadline1,
        tasks: [
          {
            title: 'Task A',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          }
        ]
      });

      await createApplication({
        userId: testUserId,
        schoolName: 'School B',
        deadline: deadline2,
        tasks: [
          {
            title: 'Task B',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 2,
            globalOrder: 2
          }
        ]
      });

      await createApplication({
        userId: testUserId,
        schoolName: 'School C',
        deadline: deadline3,
        tasks: [
          {
            title: 'Task C',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 3
          }
        ]
      });

      const result = await calculateWeeklyPlan(testUserId);

      // Each task should be scheduled before or at its deadline week (accounting for 2-day buffer)
      const taskAWeek = result.weeklyPlan.find(week =>
        week.tasks.some(task => task.title === 'Task A')
      )?.weekNumber;

      const taskBWeek = result.weeklyPlan.find(week =>
        week.tasks.some(task => task.title === 'Task B')
      )?.weekNumber;

      const taskCWeek = result.weeklyPlan.find(week =>
        week.tasks.some(task => task.title === 'Task C')
      )?.weekNumber;

      expect(taskAWeek).toBeDefined();
      expect(taskBWeek).toBeDefined();
      expect(taskCWeek).toBeDefined();

      // Task A should be in week 1 (deadline is week 1)
      expect(taskAWeek).toBeLessThanOrEqual(1);
      // Task B should be in week 1 or 2 (deadline is week 2)
      expect(taskBWeek).toBeLessThanOrEqual(2);
      // Task C should be in week 1, 2, or 3 (deadline is week 3)
      expect(taskCWeek).toBeLessThanOrEqual(3);
    });
  });

  describe('Dynamic recalculation on task changes', () => {
    it('should recalculate schedule when a task is completed', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14); // 2 weeks

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Harvard',
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
          },
          {
            title: 'Task 3',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 3
          }
        ]
      });

      // Get initial schedule
      const initialResult = await calculateWeeklyPlan(testUserId);
      const initialTotalTasks = initialResult.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );
      const initialTotalHours = initialResult.weeklyPlan.reduce(
        (sum, week) => sum + week.totalHours,
        0
      );

      expect(initialTotalTasks).toBe(3);
      expect(initialTotalHours).toBe(10); // 5 + 3 + 2

      // Complete first task
      await updateTaskStatus(application.tasks[0].id, 'completed');

      // Get new schedule after completion
      const newResult = await calculateWeeklyPlan(testUserId);
      const newTotalTasks = newResult.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );
      const newTotalHours = newResult.weeklyPlan.reduce(
        (sum, week) => sum + week.totalHours,
        0
      );

      // Schedule should now exclude the completed task
      expect(newTotalTasks).toBe(2);
      expect(newTotalHours).toBe(5); // 3 + 2 (Task 1 excluded)

      // Verify totalWorkTime includes all tasks (completed + pending)
      expect(newResult.totalWorkTime).toBe(10);
    });

    it('should recalculate schedule when a task is deleted', async () => {
      const prisma = getTestPrisma();
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 21); // 3 weeks

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Yale',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 4,
            globalOrder: 1
          },
          {
            title: 'Essay Final',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 2,
            globalOrder: 2
          },
          {
            title: 'Review',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 3,
            globalOrder: 3
          }
        ]
      });

      // Get initial schedule
      const initialResult = await calculateWeeklyPlan(testUserId);
      const initialTotalTasks = initialResult.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );

      expect(initialTotalTasks).toBe(3);

      // Delete one task
      await prisma.task.delete({
        where: { id: application.tasks[1].id }
      });

      // Get new schedule after deletion
      const newResult = await calculateWeeklyPlan(testUserId);
      const newTotalTasks = newResult.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );
      const newTotalHours = newResult.weeklyPlan.reduce(
        (sum, week) => sum + week.totalHours,
        0
      );

      // Schedule should now exclude the deleted task
      expect(newTotalTasks).toBe(2);
      expect(newTotalHours).toBe(7); // 4 + 3 (Essay Final excluded)
    });

    it('should recalculate schedule when a new task is added', async () => {
      const prisma = getTestPrisma();
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14); // 2 weeks

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Princeton',
        deadline,
        tasks: [
          {
            title: 'Initial Task',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 3,
            globalOrder: 1
          }
        ]
      });

      // Get initial schedule
      const initialResult = await calculateWeeklyPlan(testUserId);
      const initialTotalTasks = initialResult.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );

      expect(initialTotalTasks).toBe(1);

      // Add a new task
      await prisma.task.create({
        data: {
          title: 'New Task',
          taskTypeId: taskTypeIds['essay-final'],
          timeEstimate: 2,
          applicationId: application.id,
          globalOrder: 2
        }
      });

      // Get new schedule after adding task
      const newResult = await calculateWeeklyPlan(testUserId);
      const newTotalTasks = newResult.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );
      const newTotalHours = newResult.weeklyPlan.reduce(
        (sum, week) => sum + week.totalHours,
        0
      );

      // Schedule should now include the new task
      expect(newTotalTasks).toBe(2);
      expect(newTotalHours).toBe(5); // 3 + 2
    });

    it('should handle task completion reversal (pending -> completed -> pending)', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const application = await createApplication({
        userId: testUserId,
        schoolName: 'Columbia',
        deadline,
        tasks: [
          {
            title: 'Task A',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 4,
            globalOrder: 1
          },
          {
            title: 'Task B',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 2,
            globalOrder: 2
          }
        ]
      });

      // Initial schedule
      const initial = await calculateWeeklyPlan(testUserId);
      expect(initial.totalWorkTime).toBe(6);

      // Complete Task A
      await updateTaskStatus(application.tasks[0].id, 'completed');
      const afterCompletion = await calculateWeeklyPlan(testUserId);
      expect(afterCompletion.totalWorkTime).toBe(6); // Still 6 (includes completed)

      // Revert Task A back to pending
      await updateTaskStatus(application.tasks[0].id, 'pending');
      const afterReversal = await calculateWeeklyPlan(testUserId);
      expect(afterReversal.totalWorkTime).toBe(6);

      // Schedule should be back to original state
      const finalTotalTasks = afterReversal.weeklyPlan.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );
      expect(finalTotalTasks).toBe(2);
    });
  });

  describe('Empty week handling', () => {
    it('should schedule at least one task per week even if it exceeds average capacity', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 28); // 4 weeks

      await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
        deadline,
        tasks: [
          {
            title: 'Large Task 1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 8, // Large task
            globalOrder: 1
          },
          {
            title: 'Large Task 2',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 8, // Large task
            globalOrder: 2
          },
          {
            title: 'Small Task',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 3
          }
        ]
      });

      const result = await calculateWeeklyPlan(testUserId);

      // Calculate average: (8 + 8 + 2) * 1.1 / 4 weeks = ~5 hours/week
      // Large Task 1 (8h) exceeds avg, but should still schedule in week 1 (empty week rule)
      // Large Task 2 (8h) exceeds avg, but should still schedule in week 2 (empty week rule)
      // Small Task (2h) fits in avg, schedules in next available week

      const week1Tasks = result.weeklyPlan.find(w => w.weekNumber === 1)?.tasks || [];
      const week2Tasks = result.weeklyPlan.find(w => w.weekNumber === 2)?.tasks || [];

      // Week 1 should have at least one task (Large Task 1)
      expect(week1Tasks.length).toBeGreaterThanOrEqual(1);
      expect(week1Tasks.some(t => t.title === 'Large Task 1')).toBe(true);

      // Week 2 should have at least one task (Large Task 2 or Small Task)
      expect(week2Tasks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Urgent deadline handling', () => {
    it('should force schedule tasks with imminent deadlines even if week is full', async () => {
      const urgentDeadline = new Date();
      urgentDeadline.setDate(urgentDeadline.getDate() + 3); // 3 days (week 1)

      const laterDeadline = new Date();
      laterDeadline.setDate(laterDeadline.getDate() + 28); // 4 weeks

      // Create many tasks with later deadline (to fill up weeks)
      await createApplication({
        userId: testUserId,
        schoolName: 'School A',
        deadline: laterDeadline,
        tasks: [
          {
            title: 'Later Task 1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 10,
            globalOrder: 1
          },
          {
            title: 'Later Task 2',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 10,
            globalOrder: 2
          }
        ]
      });

      // Create urgent task
      await createApplication({
        userId: testUserId,
        schoolName: 'Urgent School',
        deadline: urgentDeadline,
        tasks: [
          {
            title: 'Urgent Task',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 5,
            globalOrder: 3
          }
        ]
      });

      const result = await calculateWeeklyPlan(testUserId);

      // Find urgent task
      const urgentTaskWeek = result.weeklyPlan.find(week =>
        week.tasks.some(task => task.title === 'Urgent Task')
      );

      expect(urgentTaskWeek).toBeDefined();
      // Urgent task must be in week 1 (before its deadline)
      expect(urgentTaskWeek!.weekNumber).toBe(1);
    });
  });
});
