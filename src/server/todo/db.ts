import { Store, schema } from 'modelence/server';

export const dbTodos = new Store('todos', {
  schema: {
    text: schema.string(),
    completed: schema.boolean(),
    createdAt: schema.date(),
    userId: schema.userId(),
  },
  indexes: [
    { key: { userId: 1, createdAt: -1 } },
    { key: { completed: 1, createdAt: 1 } }, // For cleanup cron
  ],
});
