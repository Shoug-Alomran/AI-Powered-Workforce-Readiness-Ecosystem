import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

/*
 * Runs against whatever DATABASE_URL points at, hosted or file-backed.
 *
 * It used to return early for anything that was not a `libsql:` URL, on the
 * reasoning that file-backed databases get their schema from
 * `prisma migrate deploy`. That reasoning is sound and the consequence was not:
 * it meant no local run and no CI run ever executed this file, so the only
 * environment that exercised it was production, on a deploy. A column added to
 * the schema could therefore reach production having never once been through
 * the runner that is supposed to add it.
 *
 * Every step below is guarded on the current shape of the table, so running it
 * against an already-migrated database does nothing at all. Being a no-op is
 * exactly what makes it safe to put on the default build path, which is where
 * it now lives: Vercel invokes `npm run build`, not `build:production`, so the
 * migration step was never reached on a deploy either.
 */
if (!url) {
  console.log(
    "Skipping schema migration: DATABASE_URL is not set."
  );
  process.exit(0);
}

const isHosted = url.startsWith("libsql:");

if (isHosted && !authToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN is required for a libsql DATABASE_URL"
  );
}

const client = createClient(
  isHosted ? { url, authToken } : { url }
);

/*
 * A database with no tables yet is not a database this script can migrate: the
 * schema is created by `prisma migrate deploy`, which has not run. Adding
 * columns to a table that does not exist would fail the build for a state that
 * is simply "not ready yet", so it stops instead.
 */
const bootstrapped = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Job'"
);

if (bootstrapped.rows.length === 0) {
  console.log(
    "Skipping schema migration: no schema present yet (run `prisma migrate deploy` first)."
  );
  client.close();
  process.exit(0);
}

console.log(
  `Checking schema against ${isHosted ? "the hosted database" : url}...`
);

try {
  // =========================================================
  // TRUST, SUPPORT, AND SHARING MIGRATION
  // =========================================================

  const experienceColumns =
    await client.execute(
      "PRAGMA table_info('Experience')"
    );

  const hasExperienceEvidenceUrl =
    experienceColumns.rows.some(
      (row) => row.name === "evidenceUrl"
    );

  if (!hasExperienceEvidenceUrl) {
    console.log(
      "Applying trust/support/sharing migration..."
    );

    const migration =
      await readFile(
        new URL(
          "../prisma/migrations/20260804194821_trust_support_and_sharing/migration.sql",
          import.meta.url
        ),
        "utf8"
      );

    await client.executeMultiple(
      migration
    );

    console.log(
      "Trust/support/sharing migration applied."
    );
  }


  // =========================================================
  // PRIVATE EVIDENCE DOCUMENT MIGRATION
  // =========================================================

  const documentColumns =
    await client.execute(
      "PRAGMA table_info('EvidenceDocument')"
    );

  const hasEvidenceDocumentTable =
    documentColumns.rows.some(
      (row) => row.name === "storageKey"
    );

  if (!hasEvidenceDocumentTable) {
    console.log(
      "Applying private evidence document migration..."
    );

    const documentMigration =
      await readFile(
        new URL(
          "../prisma/migrations/20260814190000_private_evidence_documents/migration.sql",
          import.meta.url
        ),
        "utf8"
      );

    await client.executeMultiple(
      documentMigration
    );

    console.log(
      "Private evidence document migration applied."
    );
  }


  // =========================================================
  // SCHEMA RECONCILIATION
  // =========================================================
  // Everything above creates tables. Everything else this project has ever
  // needed in production has been an additive, nullable column, and each one
  // used to get its own hand-written block here.
  //
  // That list drifted, twice, in the only way a hand-maintained list can: a
  // migration was added to prisma/migrations and nobody remembered to also
  // teach this file about it. Production then ran a schema the application
  // did not expect, and the failure surfaced as a query error in front of a
  // user - `no such column: main.Job.department` during a build, and
  // `no such column: passwordHash` on the demo sign-in page. Four migrations
  // were unapplied by the time the second one was noticed.
  //
  // So the list is gone. The columns are derived from prisma/schema.prisma,
  // which is the thing that actually defines what the application expects, and
  // a new nullable column is picked up with no edit here at all.
  //
  // Deliberately narrow. It adds missing columns and missing indexes, and
  // nothing else: a missing table, a dropped column, a changed type or a data
  // backfill is refused with an explanation, because those need a considered
  // migration rather than a guess. The early migrations in this project rebuild
  // tables through a temporary copy, and replaying one of those against live
  // data would silently drop columns it predates.

  /** Prisma scalar types and how the SQLite connector renders them. */
  const SQLITE_TYPE = {
    String: "TEXT", Boolean: "BOOLEAN", Int: "INTEGER", BigInt: "BIGINT",
    Float: "REAL", Decimal: "DECIMAL", DateTime: "DATETIME", Json: "JSONB",
    Bytes: "BLOB",
  };

  const schema = await readFile(
    new URL("../prisma/schema.prisma", import.meta.url),
    "utf8"
  );

  /**
   * The columns and indexes each model expects, read from the schema.
   *
   * Relation fields and list fields are not columns; a relation's foreign key
   * is declared separately as its own scalar field, so it is picked up anyway.
   */
  function parseSchema(source) {
    const enums = new Set(
      [...source.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((match) => match[1])
    );
    const models = [];

    for (const block of source.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
      const [, name, body] = block;
      const columns = [];
      const indexes = [];

      for (const rawLine of body.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("//")) continue;

        if (line.startsWith("@@index") || line.startsWith("@@unique")) {
          const fields = line.match(/\[([^\]]+)\]/);
          if (!fields) continue;
          const parts = fields[1]
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          if (parts.length === 0) continue;
          // Prisma's own naming, so an index it already created is recognised.
          const suffix = line.startsWith("@@unique") ? "key" : "idx";
          indexes.push({
            name: `${name}_${parts.join("_")}_${suffix}`,
            columns: parts,
            unique: line.startsWith("@@unique"),
          });
          continue;
        }

        if (line.startsWith("@@")) continue;

        const field = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
        if (!field) continue;
        const [, fieldName, fieldType, isList, isOptional, attributes] = field;

        if (isList) continue;                                  // relation list
        if (attributes.includes("@relation")) continue;        // relation object
        if (!(fieldType in SQLITE_TYPE) && !enums.has(fieldType)) continue;

        // A field carrying @unique gets its own single-column index.
        if (/@unique\b/.test(attributes)) {
          indexes.push({ name: `${name}_${fieldName}_key`, columns: [fieldName], unique: true });
        }

        // Balances one level of nesting so `@default(now())` reads as "now()"
        // rather than "now(", which then shows up verbatim in an error message.
        const defaultMatch = attributes.match(/@default\(((?:[^()]|\([^()]*\))*)\)/);

        columns.push({
          name: fieldName,
          type: enums.has(fieldType) ? "TEXT" : SQLITE_TYPE[fieldType],
          required: !isOptional,
          default: defaultMatch ? defaultMatch[1].trim() : null,
          isId: /@id\b/.test(attributes),
        });
      }

      models.push({ name, columns, indexes });
    }

    return models;
  }

  /**
   * The SQL literal for a Prisma default, or null when it is computed.
   *
   * Only values SQLite can write into every existing row unaided qualify:
   * booleans, numbers and quoted strings. `now()`, `cuid()`, `uuid()`,
   * `autoincrement()` and `dbgenerated()` are refused by returning null.
   */
  function literalDefault(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (text === "true" || text === "false") return text;
    if (/^-?\d+(\.\d+)?$/.test(text)) return text;
    if (/^"([^"\\]*)"$/.test(text)) return `'${text.slice(1, -1).replaceAll("'", "''")}'`;
    return null;
  }

  const models = parseSchema(schema);

  if (models.length === 0) {
    throw new Error(
      "Schema reconciliation read no models from prisma/schema.prisma"
    );
  }

  const addedColumns = [];
  const addedIndexes = [];
  const unreconcilable = [];

  const tableNames = new Set(
    (
      await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table'"
      )
    ).rows.map((row) => row.name)
  );

  for (const model of models) {
    if (!tableNames.has(model.name)) {
      unreconcilable.push(
        `table "${model.name}" does not exist; create it with a migration rather than here`
      );
      continue;
    }

    const present = new Set(
      (
        await client.execute(`PRAGMA table_info('${model.name}')`)
      ).rows.map((row) => row.name)
    );

    for (const column of model.columns) {
      if (present.has(column.name)) continue;

      // A NOT NULL column added to a populated table needs a value for the
      // rows already there. A literal default supplies one; an expression
      // default (now(), cuid(), autoincrement(), dbgenerated()) does not,
      // because SQLite cannot evaluate it in a DEFAULT clause. The first is
      // safe to add here, the second needs a migration that decides what the
      // existing rows should say.
      let clause = `"${column.name}" ${column.type}`;

      if (column.required) {
        const literal = literalDefault(column.default);
        if (literal === null) {
          unreconcilable.push(
            `"${model.name}"."${column.name}" is required with ${column.default ? `a computed default (${column.default})` : "no default"}; adding it to existing rows needs a migration that decides their value`
          );
          continue;
        }
        clause += ` NOT NULL DEFAULT ${literal}`;
      } else if (column.default !== null) {
        const literal = literalDefault(column.default);
        if (literal !== null) clause += ` DEFAULT ${literal}`;
      }

      await client.execute(
        `ALTER TABLE "${model.name}" ADD COLUMN ${clause}`
      );
      addedColumns.push(`${model.name}.${column.name}`);
    }
  }

  if (unreconcilable.length > 0) {
    throw new Error(
      `Schema reconciliation cannot proceed:\n  - ${unreconcilable.join("\n  - ")}`
    );
  }

  // Indexes only affect how fast a query runs, so a failure to create one is
  // reported and does not stop a deployment.
  const indexNames = new Set(
    (
      await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'index'"
      )
    ).rows.map((row) => row.name)
  );

  for (const model of models) {
    if (!tableNames.has(model.name)) continue;
    for (const index of model.indexes) {
      if (indexNames.has(index.name)) continue;
      const columns = index.columns.map((column) => `"${column}"`).join(", ");
      try {
        await client.execute(
          `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS "${index.name}" ON "${model.name}"(${columns})`
        );
        addedIndexes.push(index.name);
      } catch (error) {
        console.warn(
          `Could not create index ${index.name}: ${error.message}`
        );
      }
    }
  }

  if (addedColumns.length > 0) {
    console.log(
      `Schema reconciliation added ${addedColumns.length} column(s): ${addedColumns.join(", ")}.`
    );
  }

  if (addedIndexes.length > 0) {
    console.log(
      `Schema reconciliation added ${addedIndexes.length} index(es): ${addedIndexes.join(", ")}.`
    );
  }

  if (addedColumns.length === 0 && addedIndexes.length === 0) {
    console.log("Schema reconciliation: database already matches the schema.");
  }

  // Verification. Every column the application can query must now exist, so a
  // deploy fails here with a readable message rather than part way through a
  // page render in front of a user.
  for (const model of models) {
    const present = new Set(
      (
        await client.execute(`PRAGMA table_info('${model.name}')`)
      ).rows.map((row) => row.name)
    );
    for (const column of model.columns) {
      if (!present.has(column.name)) {
        throw new Error(
          `Schema verification failed: "${model.name}"."${column.name}" is missing after reconciliation`
        );
      }
    }
  }


  console.log(
    "Production migrations applied and verified successfully."
  );

} finally {
  client.close();
}