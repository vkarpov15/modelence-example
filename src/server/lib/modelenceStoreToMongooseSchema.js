import mongoose from 'mongoose';

export function modelenceStoreToMongooseSchema(store, options = {}) {
  return new mongoose.Schema(convertObject(store.getSerializedSchema(), options), options.schemaOptions);
}

function convertObject(schema, options, basePath = '') {
  const definition = {};

  for (const [key, value] of Object.entries(schema)) {
    if (value === 'v2') {
      continue;
    }

    const path = basePath ? `${basePath}.${key}` : key;
    definition[key] = options.fieldOverrides?.[path] ?? convertValue(value, path, options);
  }

  return definition;
}

function convertValue(field, path, options) {
  if (!field || Array.isArray(field) || typeof field !== 'object') {
    return mongoose.Schema.Types.Mixed;
  }

  if (!('type' in field)) {
    return convertObject(field, options, path);
  }

  switch (field.type) {
    case 'string':
      return withOptional(field, { type: String });
    case 'number':
      return withOptional(field, { type: Number });
    case 'boolean':
      return withOptional(field, { type: Boolean });
    case 'date':
      return withOptional(field, { type: Date });
    case 'enum':
      return withOptional(field, { type: String, enum: [...field.items] });
    case 'array':
      return withOptional(field, [convertValue(field.items, `${path}[]`, options)]);
    case 'object':
      return withOptional(field, convertObject(field.items, options, path));
    case 'union':
      return withOptional(
        field,
        options.unionResolver?.({ path, field }) ?? { type: mongoose.Schema.Types.Mixed }
      );
    case 'custom':
      return withOptional(field, resolveCustomType(field, path, options));
    default:
      return withOptional(field, { type: mongoose.Schema.Types.Mixed });
  }
}

function resolveCustomType(field, path, options) {
  const resolved =
    options.customTypeResolvers?.[field.typeName]?.({ path, field }) ??
    options.customTypeOverrides?.[field.typeName];

  if (resolved) {
    return resolved;
  }

  if (field.typeName === 'ObjectId' || field.typeName === 'UserId') {
    return { type: mongoose.Schema.Types.ObjectId };
  }

  if (field.typeName === 'Ref') {
    const ref = options.refPaths?.[path];
    return ref
      ? { type: mongoose.Schema.Types.ObjectId, ref }
      : { type: mongoose.Schema.Types.ObjectId };
  }

  return { type: mongoose.Schema.Types.Mixed };
}

function withOptional(field, definition) {
  if (!field.optional || Array.isArray(definition) || !definition || typeof definition !== 'object') {
    return definition;
  }

  // Nested object definitions in Mongoose are plain objects without `type`.
  // Adding `required` there creates invalid field configs like `{ nested, required: false }`.
  if (!('type' in definition)) {
    return definition;
  }

  return { ...definition, required: false };
}
