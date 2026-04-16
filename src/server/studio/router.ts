import mongoose, { type Connection } from 'mongoose';
import { dbUsers, getConfig, type Store } from 'modelence/server';

import { modelenceStoreToMongooseSchema } from '@/server/lib/modelenceStoreToMongooseSchema';
import { appModules } from '@/server/modules';

import { express as createStudioRouter } from '@mongoosejs/studio';

type StudioRouter = (req: unknown, res: unknown, next: (err?: unknown) => void) => void;
type ModelenceStore = Pick<Store<any, any>, 'getName' | 'getSerializedSchema'>;

let studioConnection: Connection | null = null;
let studioConnectionPromise: Promise<Connection> | null = null;
let studioRouter: StudioRouter | null = null;

export async function getStudioRouter() {
  if (studioRouter != null) {
    return studioRouter;
  }

  const connection = await getStudioConnection();
  studioRouter = await createStudioRouter('/studio/api', connection) as StudioRouter;
  return studioRouter;
}

async function getStudioConnection() {
  if (studioConnection != null) {
    return studioConnection;
  }

  if (studioConnectionPromise == null) {
    const mongodbUri = process.env.MONGODB_URI || String(getConfig('_system.mongodbUri') || '');
    if (mongodbUri.length === 0) {
      throw new Error('Mongoose Studio requires MONGODB_URI (or _system.mongodbUri) to be set');
    }

    studioConnectionPromise = mongoose.createConnection(mongodbUri).asPromise().then((connection) => {
      for (const store of getActiveStores()) {
        const modelName = getModelNameForStore(store);
        if (connection.models[modelName] != null) {
          continue;
        }

        const schema = modelenceStoreToMongooseSchema(store);
        connection.model(modelName, schema, store.getName());
      }

      studioConnection = connection;
      return connection;
    });
  }

  return studioConnectionPromise;
}

function getActiveStores() {
  const storesByCollectionName = new Map<string, ModelenceStore>();

  for (const module of appModules) {
    for (const store of module.stores) {
      storesByCollectionName.set(store.getName(), store);
    }
  }

  storesByCollectionName.set(dbUsers.getName(), dbUsers);

  return [...storesByCollectionName.values()];
}

function getModelNameForStore(store: ModelenceStore) {
  const rawName = store.getName().replace(/^_modelence/, '');
  const normalized = rawName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  const words = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

  return words.join('');
}

function singularize(value: string) {
  if (value.endsWith('ies') && value.length > 3) {
    return value.slice(0, -3) + 'y';
  }
  if (value.endsWith('ses') && value.length > 3) {
    return value.slice(0, -2);
  }
  if (value.endsWith('s') && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
}
