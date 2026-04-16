import { startApp } from 'modelence/server';
import { appModules } from '@/server/modules';
import studioModule from '@/server/studio';
import { createDemoUser } from '@/server/migrations/createDemoUser';

startApp({
  modules: [...appModules, studioModule],

  security: {
    frameAncestors: ['https://modelence.com', 'https://*.modelence.com', 'http://localhost:*'],
  },

  migrations: [{
    version: 1,
    description: 'Create demo user',
    handler: createDemoUser,
  }],
});
