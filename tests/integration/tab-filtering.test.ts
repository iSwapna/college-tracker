import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, resetDatabase, getTestPrisma, createTestUser } from '../setup';
import { createApplication } from '../../src/lib/prisma';
import { filterTasksByTab } from '../../src/lib/taskFilters';

describe('Tab Filtering Logic', () => {
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

  describe('Essays tab', () => {
    it('should show only essay-draft and essay-final task types', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
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
            title: 'Timebox Task',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 3
          },
          {
            title: 'Notification Task',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 4
          }
        ]
      });

      const essayTasks = filterTasksByTab(app.tasks, 'essays');

      expect(essayTasks.length).toBe(2);
      expect(essayTasks.every(t => t.taskType.type === 'essay-draft' || t.taskType.type === 'essay-final')).toBe(true);
    });

    it('should show tasks with custom essay titles if they have essay types', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'UC School',
        deadline,
        tasks: [
          {
            title: 'PIQ1',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 4,
            globalOrder: 1
          },
          {
            title: 'PIQ2',
            taskTypeId: taskTypeIds['essay-final'],
            timeEstimate: 4,
            globalOrder: 2
          }
        ]
      });

      const essayTasks = filterTasksByTab(app.tasks, 'essays');

      expect(essayTasks.length).toBe(2);
      expect(essayTasks.some(t => t.title === 'PIQ1')).toBe(true);
      expect(essayTasks.some(t => t.title === 'PIQ2')).toBe(true);
    });
  });

  describe('Tests & Transcripts tab', () => {
    it('should show tasks with "test" or "transcript" in title', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
        deadline,
        tasks: [
          {
            title: 'Submit Test Scores',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 1
          },
          {
            title: 'Send Transcripts',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 2
          },
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 3
          }
        ]
      });

      const testTasks = filterTasksByTab(app.tasks, 'tests');

      expect(testTasks.length).toBe(2);
      expect(testTasks.some(t => t.title === 'Submit Test Scores')).toBe(true);
      expect(testTasks.some(t => t.title === 'Send Transcripts')).toBe(true);
    });
  });

  describe('Recommendations tab', () => {
    it('should show tasks with "recommendation" or "reference" in title', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
        deadline,
        tasks: [
          {
            title: 'Request Recommendations',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 1
          },
          {
            title: 'Follow up on Reference Letters',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 2
          },
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 3
          }
        ]
      });

      const recTasks = filterTasksByTab(app.tasks, 'recommendations');

      expect(recTasks.length).toBe(2);
      expect(recTasks.some(t => t.title === 'Request Recommendations')).toBe(true);
      expect(recTasks.some(t => t.title === 'Follow up on Reference Letters')).toBe(true);
    });
  });

  describe('Rest of Form tab', () => {
    it('should show tasks that do not match other categories', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Submit Test Scores',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 2
          },
          {
            title: 'Request Recommendations',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 3
          },
          {
            title: 'Rest of Form',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 2,
            globalOrder: 4
          },
          {
            title: 'Activities Section',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 3,
            globalOrder: 5
          }
        ]
      });

      const formsTasks = filterTasksByTab(app.tasks, 'forms');

      // Should include "Rest of Form" and "Activities Section"
      // Should NOT include essay, test, or recommendation tasks
      expect(formsTasks.length).toBe(2);
      expect(formsTasks.some(t => t.title === 'Rest of Form')).toBe(true);
      expect(formsTasks.some(t => t.title === 'Activities Section')).toBe(true);
    });

    it('should include notification tasks', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
        deadline,
        tasks: [
          {
            title: 'Submit Application',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 1
          },
          {
            title: 'Check Portal',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 2
          }
        ]
      });

      const formsTasks = filterTasksByTab(app.tasks, 'forms');

      expect(formsTasks.length).toBe(2);
      expect(formsTasks.some(t => t.title === 'Submit Application')).toBe(true);
      expect(formsTasks.some(t => t.title === 'Check Portal')).toBe(true);
    });
  });

  describe('No tasks lost', () => {
    it('should ensure every task appears in at least one tab', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Submit Test Scores',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 2
          },
          {
            title: 'Request Recommendations',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 3
          },
          {
            title: 'Activities Section',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 3,
            globalOrder: 4
          },
          {
            title: 'Submit Application',
            taskTypeId: taskTypeIds['notification'],
            timeEstimate: 0,
            globalOrder: 5
          }
        ]
      });

      const essayTasks = filterTasksByTab(app.tasks, 'essays');
      const testTasks = filterTasksByTab(app.tasks, 'tests');
      const recTasks = filterTasksByTab(app.tasks, 'recommendations');
      const formsTasks = filterTasksByTab(app.tasks, 'forms');

      const allTabTasks = [...essayTasks, ...testTasks, ...recTasks, ...formsTasks];
      const uniqueTaskIds = new Set(allTabTasks.map(t => t.id));

      // Every task should appear in at least one tab
      expect(uniqueTaskIds.size).toBe(app.tasks.length);

      // Verify each task is present
      app.tasks.forEach(task => {
        expect(uniqueTaskIds.has(task.id)).toBe(true);
      });
    });

    it('should not show tasks in multiple tabs (except edge cases)', async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);

      const app = await createApplication({
        userId: testUserId,
        schoolName: 'Test School',
        deadline,
        tasks: [
          {
            title: 'Essay Draft',
            taskTypeId: taskTypeIds['essay-draft'],
            timeEstimate: 2,
            globalOrder: 1
          },
          {
            title: 'Submit Test Scores',
            taskTypeId: taskTypeIds['timebox'],
            timeEstimate: 1,
            globalOrder: 2
          }
        ]
      });

      const essayTasks = filterTasksByTab(app.tasks, 'essays');
      const testTasks = filterTasksByTab(app.tasks, 'tests');
      const recTasks = filterTasksByTab(app.tasks, 'recommendations');
      const formsTasks = filterTasksByTab(app.tasks, 'forms');

      // Essay Draft should only be in essays tab
      expect(essayTasks.some(t => t.title === 'Essay Draft')).toBe(true);
      expect(testTasks.some(t => t.title === 'Essay Draft')).toBe(false);
      expect(recTasks.some(t => t.title === 'Essay Draft')).toBe(false);
      expect(formsTasks.some(t => t.title === 'Essay Draft')).toBe(false);

      // Submit Test Scores should only be in tests tab
      expect(essayTasks.some(t => t.title === 'Submit Test Scores')).toBe(false);
      expect(testTasks.some(t => t.title === 'Submit Test Scores')).toBe(true);
      expect(recTasks.some(t => t.title === 'Submit Test Scores')).toBe(false);
      expect(formsTasks.some(t => t.title === 'Submit Test Scores')).toBe(false);
    });
  });
});
