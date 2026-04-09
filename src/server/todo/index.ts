import z from 'zod';
import { AuthError, time } from 'modelence';
import { Module, ObjectId, UserInfo } from 'modelence/server';
import { dbTodos } from './db';

// Cron job to clear incomplete todos at end of day (runs at midnight)
const clearIncompleteTodosCron = {
  description: 'Clear incomplete todos at end of day',
  interval: time.hours(1), // Check every hour
  handler: async () => {
    const now = new Date();
    // Get start of current day
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Delete all incomplete todos created before today
    await dbTodos.deleteMany({
      completed: false,
      createdAt: { $lt: startOfToday }
    });
  },
};

export default new Module('todo', {
  stores: [dbTodos],

  queries: {
    getTodos: async (_args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const todos = await dbTodos.fetch(
        { userId: new ObjectId(user.id) },
        { sort: { createdAt: -1 } }
      );

      return todos.map((todo) => ({
        _id: todo._id.toString(),
        text: todo.text,
        completed: todo.completed,
        createdAt: todo.createdAt,
      }));
    },
  },

  mutations: {
    addTodo: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const { text } = z.object({ text: z.string().min(1).max(500) }).parse(args);

      await dbTodos.insertOne({
        text: text.trim(),
        completed: false,
        createdAt: new Date(),
        userId: new ObjectId(user.id),
      });
    },

    toggleTodo: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const { todoId } = z.object({ todoId: z.string() }).parse(args);

      const todo = await dbTodos.requireOne({ _id: new ObjectId(todoId) });

      if (todo.userId.toString() !== user.id) {
        throw new AuthError('Not authorized');
      }

      await dbTodos.updateOne(
        { _id: new ObjectId(todoId) },
        { $set: { completed: !todo.completed } }
      );
    },

    deleteTodo: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }

      const { todoId } = z.object({ todoId: z.string() }).parse(args);

      const todo = await dbTodos.requireOne({ _id: new ObjectId(todoId) });

      if (todo.userId.toString() !== user.id) {
        throw new AuthError('Not authorized');
      }

      await dbTodos.deleteOne({ _id: new ObjectId(todoId) });
    },
  },

  cronJobs: {
    clearIncompleteTodos: clearIncompleteTodosCron,
  },
});
