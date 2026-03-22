import fs from 'node:fs';
import path from 'node:path';

const specPath = path.resolve('docs/APIs/openapi.json');

function toNullableSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (schema.nullable !== true) {
    delete schema.nullable;
    return schema;
  }

  const normalized = { ...schema };
  delete normalized.nullable;

  if (Array.isArray(normalized.type)) {
    if (!normalized.type.includes('null')) {
      normalized.type = [...normalized.type, 'null'];
    }
    return normalized;
  }

  if (typeof normalized.type === 'string') {
    normalized.type = [normalized.type, 'null'];
    return normalized;
  }

  if (Array.isArray(normalized.enum) && !normalized.enum.includes(null)) {
    normalized.enum = [...normalized.enum, null];
    return normalized;
  }

  if (normalized.$ref) {
    const ref = normalized.$ref;
    delete normalized.$ref;
    return {
      anyOf: [{ $ref: ref }, { type: 'null' }],
      ...normalized,
    };
  }

  if (normalized.anyOf) {
    return {
      ...normalized,
      anyOf: [...normalized.anyOf, { type: 'null' }],
    };
  }

  return {
    anyOf: [normalized, { type: 'null' }],
  };
}

function normalizeNode(node) {
  if (Array.isArray(node)) {
    return node.map(item => normalizeNode(item));
  }

  if (!node || typeof node !== 'object') {
    return node;
  }

  const normalizedEntries = Object.entries(node).map(([key, value]) => [key, normalizeNode(value)]);
  const normalizedNode = Object.fromEntries(normalizedEntries);

  return toNullableSchema(normalizedNode);
}

if (!fs.existsSync(specPath)) {
  console.warn(`[normalize-openapi] Skipping because ${specPath} does not exist.`);
  process.exit(0);
}

const raw = fs.readFileSync(specPath, 'utf8');
const parsed = JSON.parse(raw);
const normalized = normalizeNode(parsed);

normalized.openapi = '3.1.0';
normalized.jsonSchemaDialect = 'https://spec.openapis.org/oas/3.1/dialect/base';

fs.writeFileSync(specPath, `${JSON.stringify(normalized, null, 2)}\n`);

console.log(`[normalize-openapi] Normalized ${specPath} to OpenAPI 3.1.`);
