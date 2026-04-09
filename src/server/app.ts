import { startApp } from 'modelence/server';
import todoModule from '@/server/todo';
import { createDemoUser } from '@/server/migrations/createDemoUser';

startApp({
  modules: [todoModule],

  security: {
    frameAncestors: ['https://modelence.com', 'https://*.modelence.com', 'http://localhost:*'],
  },

  migrations: [{
    version: 1,
    description: 'Create demo user',
    handler: createDemoUser,
  }],
});
