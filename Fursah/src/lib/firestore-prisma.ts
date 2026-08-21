import "server-only";

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { getFirebaseAdminDb } from "./firebase-admin";

type Row = Record<string, unknown>;
type Args = Record<string, unknown> | undefined;
type Field = {
  name: string;
  kind: "scalar" | "object";
  type: string;
  isList?: boolean;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  hasDefaultValue?: boolean;
  default?: unknown;
  isUpdatedAt?: boolean;
};
type Model = { name: string; fields: Field[] };
type RuntimeModel = { models: Record<string, { fields: Field[] }> };

const MODEL_DEFAULTS: Record<string, Row> = {
  User: { active: true }, EvidenceDocument: { aiStatus: "PENDING", reviewStatus: "PENDING" },
  StudentSkill: { level: 3 }, CareerTrack: { recommendedExperienceMonths: 6 },
  CareerTrackSkill: { weight: 2 }, StudentCertification: { verificationStatus: "PENDING" },
  Experience: { months: 1, verificationStatus: "SELF_REPORTED" },
  Project: { verificationStatus: "SELF_REPORTED" }, Employer: { verificationStatus: "PENDING" },
  Job: { minExperience: 0, status: "open", blindReview: false },
  JobSkill: { weight: 2, requirementType: "ESSENTIAL" },
  Application: { status: "applied", matchScore: 0 },
  RoadmapItem: { status: "NOT_STARTED", source: "AI", expectedImpact: 0 },
  ConsentRecord: { granted: false, version: "1.0" }, DataRequest: { status: "OPEN" },
  Appeal: { status: "OPEN" }, GovernanceScenario: { humanDecision: "PENDING" },
  SupportTicket: { priority: "NORMAL", status: "OPEN" }, CurriculumAction: { status: "PROPOSED" },
  Feedback: { checkpointDays: 90 },
};

const CASCADE_CHILDREN: Record<string, Array<[string, string]>> = {
  Job: [["JobSkill", "jobId"], ["JobCertification", "jobId"], ["Application", "jobId"], ["Feedback", "jobId"], ["BookmarkedJob", "jobId"]],
  Offering: [["OfferingSkill", "offeringId"]],
};

function delegateName(model: string) {
  return model[0].toLowerCase() + model.slice(1);
}

function modelName(delegate: string) {
  return delegate[0].toUpperCase() + delegate.slice(1);
}

function scalarEqual(left: unknown, right: unknown) {
  if (left instanceof Date || right instanceof Date) {
    return new Date(left as string | number | Date).getTime() === new Date(right as string | number | Date).getTime();
  }
  return left === right;
}

function compare(left: unknown, right: unknown) {
  const a = left instanceof Date ? left.getTime() : left;
  const b = right instanceof Date ? right.getTime() : right;
  if (a === b) return 0;
  return (a as string | number) < (b as string | number) ? -1 : 1;
}

/**
 * A deliberately small Prisma-compatible facade for the query shapes used by
 * Fursah. It lets the existing, type-safe call sites move to Firestore behind
 * one switch while they are gradually replaced by purpose-built repositories.
 */
export function createFirestorePrisma(metadataClient: PrismaClient): PrismaClient {
  const runtime = (metadataClient as unknown as { _runtimeDataModel: RuntimeModel })._runtimeDataModel;
  const models = new Map<string, Model>(
    Object.entries(runtime.models).map(([name, value]) => [name, { name, fields: value.fields }]),
  );

  function getModel(name: string) {
    const model = models.get(name);
    if (!model) throw new Error(`Unknown Firestore model ${name}`);
    return model;
  }

  function revive(model: Model, data: Row): Row {
    const result = { ...data };
    for (const field of model.fields) {
      if (field.kind === "scalar" && field.type === "DateTime" && typeof result[field.name] === "string") {
        result[field.name] = new Date(result[field.name] as string);
      }
    }
    return result;
  }

  function serialize(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Row)
          .filter(([, item]) => item !== undefined)
          .map(([key, item]) => [key, serialize(item)]),
      );
    }
    return value;
  }

  async function load(model: Model, memo: Map<string, Row[]>, field?: string, value?: unknown): Promise<Row[]> {
    const cacheKey = field ? `${model.name}:${field}:${JSON.stringify(serialize(value))}` : `${model.name}:all`;
    const cached = memo.get(cacheKey);
    if (cached) return cached;
    const collection = getFirebaseAdminDb().collection(delegateName(model.name));
    const snapshot = field === "id"
      ? await collection.where("id", "==", serialize(value)).get()
      : field
        ? await collection.where(field, "==", serialize(value)).get()
        : await collection.get();
    const rows = snapshot.docs.map((doc) => revive(model, { id: doc.id, ...doc.data() }));
    memo.set(cacheKey, rows);
    return rows;
  }

  function pushdown(model: Model, where: unknown): [string, unknown] | undefined {
    if (!where || typeof where !== "object") return undefined;
    for (const [key, condition] of Object.entries(where as Row)) {
      const field = model.fields.find((item) => item.kind === "scalar" && item.name === key);
      if (!field) continue;
      if (condition === null || typeof condition !== "object" || condition instanceof Date) return [key, condition];
      if ("equals" in (condition as Row)) return [key, (condition as Row).equals];
    }
    return undefined;
  }

  function inverseField(model: Model, field: Field) {
    return getModel(field.type).fields.find(
      (candidate) => candidate.kind === "object" && candidate.relationName === field.relationName,
    );
  }

  function foreignKey(model: Model, field: Field) {
    const typeKey = `${field.type[0].toLowerCase()}${field.type.slice(1)}Id`;
    const nameKey = `${field.name}Id`;
    const roleKey = field.name === "owner" ? "ownerUserId" : field.name === "actor" ? "actorUserId" : null;
    return [nameKey, typeKey, roleKey].find(
      (candidate): candidate is string => Boolean(candidate && model.fields.some((item) => item.kind === "scalar" && item.name === candidate)),
    );
  }

  function isListRelation(model: Model, field: Field) {
    if (foreignKey(model, field)) return false;
    // These are the inverse sides of one-to-one profile relations. Other
    // inverse relations in the schema are collections.
    return !(model.name === "User" && ["student", "employer", "university"].includes(field.name));
  }

  async function related(model: Model, row: Row, field: Field, memo: Map<string, Row[]>) {
    const target = getModel(field.type);
    const ownKey = foreignKey(model, field);
    if (ownKey) {
      const targets = await load(target, memo, "id", row[ownKey]);
      const found = targets.filter((candidate) => scalarEqual(row[ownKey], candidate.id));
      return found[0] ?? null;
    }
    const inverse = inverseField(model, field);
    if (!inverse) return field.isList ? [] : null;
    const inverseKey = foreignKey(target, inverse);
    if (!inverseKey) return isListRelation(model, field) ? [] : null;
    const targets = await load(target, memo, inverseKey, row.id);
    const found = targets.filter((candidate) => scalarEqual(candidate[inverseKey], row.id));
    return isListRelation(model, field) ? found : found[0] ?? null;
  }

  function scalarMatches(value: unknown, condition: unknown): boolean {
    if (condition === null || typeof condition !== "object" || condition instanceof Date || Array.isArray(condition)) {
      return scalarEqual(value, condition);
    }
    const filter = condition as Row;
    const text = String(value ?? "");
    const insensitive = filter.mode === "insensitive";
    const norm = (item: unknown) => insensitive ? String(item ?? "").toLowerCase() : String(item ?? "");
    if ("equals" in filter && !scalarEqual(value, filter.equals)) return false;
    if ("in" in filter && !(filter.in as unknown[]).some((item) => scalarEqual(value, item))) return false;
    if ("notIn" in filter && (filter.notIn as unknown[]).some((item) => scalarEqual(value, item))) return false;
    if ("lt" in filter && compare(value, filter.lt) >= 0) return false;
    if ("lte" in filter && compare(value, filter.lte) > 0) return false;
    if ("gt" in filter && compare(value, filter.gt) <= 0) return false;
    if ("gte" in filter && compare(value, filter.gte) < 0) return false;
    if ("contains" in filter && !norm(text).includes(norm(filter.contains))) return false;
    if ("startsWith" in filter && !norm(text).startsWith(norm(filter.startsWith))) return false;
    if ("endsWith" in filter && !norm(text).endsWith(norm(filter.endsWith))) return false;
    if ("not" in filter && scalarMatches(value, filter.not)) return false;
    return true;
  }

  async function matches(model: Model, row: Row, where: unknown, memo: Map<string, Row[]>): Promise<boolean> {
    if (!where || typeof where !== "object") return true;
    const filter = where as Row;
    if (filter.AND) {
      const terms = Array.isArray(filter.AND) ? filter.AND : [filter.AND];
      for (const term of terms) if (!(await matches(model, row, term, memo))) return false;
    }
    if (filter.OR) {
      const terms = Array.isArray(filter.OR) ? filter.OR : [filter.OR];
      let any = false;
      for (const term of terms) any ||= await matches(model, row, term, memo);
      if (!any) return false;
    }
    if (filter.NOT && await matches(model, row, filter.NOT, memo)) return false;

    for (const [key, condition] of Object.entries(filter)) {
      if (["AND", "OR", "NOT"].includes(key)) continue;
      const field = model.fields.find((item) => item.name === key);
      if (!field) {
        // Prisma compound unique inputs (studentId_jobId, etc.).
        if (condition && typeof condition === "object") {
          for (const [compoundKey, compoundValue] of Object.entries(condition as Row)) {
            if (!scalarMatches(row[compoundKey], compoundValue)) return false;
          }
          continue;
        }
        return false;
      }
      if (field.kind === "scalar") {
        if (!scalarMatches(row[key], condition)) return false;
        continue;
      }
      const relation = await related(model, row, field, memo);
      const relationFilter = condition as Row;
      if (isListRelation(model, field)) {
        const list = relation as Row[];
        if (relationFilter.some && !(await anyMatch(getModel(field.type), list, relationFilter.some, memo))) return false;
        if (relationFilter.none && await anyMatch(getModel(field.type), list, relationFilter.none, memo)) return false;
        if (relationFilter.every) for (const item of list) if (!(await matches(getModel(field.type), item, relationFilter.every, memo))) return false;
      } else {
        const item = relation as Row | null;
        const nested = "is" in relationFilter ? relationFilter.is : relationFilter;
        if (!item || !(await matches(getModel(field.type), item, nested, memo))) return false;
      }
    }
    return true;
  }

  async function anyMatch(model: Model, rows: Row[], where: unknown, memo: Map<string, Row[]>) {
    for (const row of rows) if (await matches(model, row, where, memo)) return true;
    return false;
  }

  async function project(model: Model, row: Row, args: Args, memo: Map<string, Row[]>): Promise<Row> {
    const include = args?.include as Row | undefined;
    const select = args?.select as Row | undefined;
    let result: Row = select ? {} : { ...row };
    if (select) for (const [key, config] of Object.entries(select)) if (config === true && key in row) result[key] = row[key];
    const relations = { ...(include ?? {}), ...Object.fromEntries(Object.entries(select ?? {}).filter(([, value]) => value && typeof value === "object")) };
    for (const [key, config] of Object.entries(relations)) {
      if (key === "_count") continue;
      const field = model.fields.find((item) => item.name === key && item.kind === "object");
      if (!field) continue;
      const value = await related(model, row, field, memo);
      const nestedArgs = config === true ? undefined : config as Args;
      if (isListRelation(model, field)) {
        let list = value as Row[];
        if (nestedArgs?.where) list = await filterRows(getModel(field.type), list, nestedArgs.where, memo);
        result[key] = await Promise.all(list.map((item) => project(getModel(field.type), item, nestedArgs, memo)));
      } else {
        result[key] = value ? await project(getModel(field.type), value as Row, nestedArgs, memo) : null;
      }
    }
    if ((include?._count || select?._count)) {
      const countConfig = (include?._count ?? select?._count) as Row | true;
      const countSelect = countConfig === true ? undefined : countConfig.select as Row;
      const counts: Row = {};
      for (const field of model.fields.filter((item) => item.kind === "object" && isListRelation(model, item))) {
        if (countSelect && !countSelect[field.name]) continue;
        counts[field.name] = ((await related(model, row, field, memo)) as Row[]).length;
      }
      result._count = counts;
    }
    return result;
  }

  async function filterRows(model: Model, rows: Row[], where: unknown, memo: Map<string, Row[]>) {
    const output: Row[] = [];
    for (const row of rows) if (await matches(model, row, where, memo)) output.push(row);
    return output;
  }

  function sortRows(rows: Row[], orderBy: unknown) {
    const orders = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
    return [...rows].sort((a, b) => {
      for (const order of orders as Row[]) {
        const [field, direction] = Object.entries(order)[0] ?? [];
        const difference = compare(a[field], b[field]);
        if (difference) return direction === "desc" ? -difference : difference;
      }
      return 0;
    });
  }

  async function find(model: Model, args: Args, one = false) {
    const memo = new Map<string, Row[]>();
    const hint = pushdown(model, args?.where);
    let rows = await filterRows(model, await load(model, memo, hint?.[0], hint?.[1]), args?.where, memo);
    rows = sortRows(rows, args?.orderBy);
    if (args?.distinct) {
      const keys = Array.isArray(args.distinct) ? args.distinct as string[] : [String(args.distinct)];
      const seen = new Set<string>();
      rows = rows.filter((row) => { const key = JSON.stringify(keys.map((item) => row[item])); if (seen.has(key)) return false; seen.add(key); return true; });
    }
    if (args?.skip) rows = rows.slice(Number(args.skip));
    if (args?.take) rows = rows.slice(0, Number(args.take));
    if (one) return rows[0] ? project(model, rows[0], args, memo) : null;
    return Promise.all(rows.map((row) => project(model, row, args, memo)));
  }

  async function write(model: Model, id: string, data: Row, merge = true) {
    const scalarNames = new Set(model.fields.filter((field) => field.kind === "scalar").map((field) => field.name));
    const scalar = Object.fromEntries(Object.entries(data).filter(([key]) => scalarNames.has(key)));
    await getFirebaseAdminDb().collection(delegateName(model.name)).doc(id).set(serialize({ ...scalar, id }) as Row, { merge });
    return find(model, { where: { id } }, true);
  }

  function defaultValue(field: Field) {
    if (field.isUpdatedAt || (field.type === "DateTime" && field.hasDefaultValue)) return new Date();
    const value = field.default;
    if (value && typeof value === "object" && "name" in (value as Row)) {
      const name = String((value as Row).name);
      if (name === "now") return new Date();
      if (name === "cuid" || name === "uuid") return randomUUID();
    }
    return value;
  }

  function withDefaults(model: Model, data: Row, id: string, updating = false) {
    const result: Row = { ...(updating ? {} : MODEL_DEFAULTS[model.name]), ...data, id };
    for (const field of model.fields.filter((item) => item.kind === "scalar")) {
      if (field.isUpdatedAt || field.name === "updatedAt") result[field.name] = new Date();
      else if (!updating && result[field.name] === undefined && field.hasDefaultValue) result[field.name] = defaultValue(field);
    }
    if (!updating && model.fields.some((field) => field.name === "createdAt") && result.createdAt === undefined) result.createdAt = new Date();
    return result;
  }

  async function createRecord(model: Model, args: Args) {
    const data = args?.data as Row;
    const id = String(data.id ?? randomUUID());
    const prepared = withDefaults(model, data, id);

    // Resolve owning-side connects before writing the parent document.
    for (const field of model.fields.filter((item) => item.kind === "object")) {
      const operation = data[field.name] as Row | undefined;
      const ownKey = foreignKey(model, field);
      if (ownKey && operation?.connect && typeof operation.connect === "object") {
        const connected = operation.connect as Row;
        prepared[ownKey] = connected.id;
      }
    }
    await write(model, id, prepared, false);

    // Prisma account creation nests the one-to-one profile below User. Store
    // it as a normal top-level Firestore document with the same foreign key
    // shape used by the migrated relational rows.
    for (const field of model.fields.filter((item) => item.kind === "object")) {
      const operation = data[field.name] as Row | undefined;
      if (!operation?.create || typeof operation.create !== "object") continue;
      const target = getModel(field.type);
      const inverse = inverseField(model, field);
      const inverseKey = inverse ? foreignKey(target, inverse) : undefined;
      const nestedData = { ...(operation.create as Row), ...(inverseKey ? { [inverseKey]: id } : {}) };
      await createRecord(target, { data: nestedData });
    }
    return find(model, { where: { id }, include: args?.include, select: args?.select }, true);
  }

  async function applyData(row: Row, data: Row) {
    const next = { ...row };
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
        const operation = value as Row;
        if ("set" in operation) next[key] = operation.set;
        else if ("increment" in operation) next[key] = Number(next[key] ?? 0) + Number(operation.increment);
        else if ("decrement" in operation) next[key] = Number(next[key] ?? 0) - Number(operation.decrement);
        else if ("multiply" in operation) next[key] = Number(next[key] ?? 0) * Number(operation.multiply);
        else if ("divide" in operation) next[key] = Number(next[key] ?? 0) / Number(operation.divide);
      } else next[key] = value;
    }
    return next;
  }

  async function deleteRecord(model: Model, row: Row) {
    for (const [childName, foreignKeyName] of CASCADE_CHILDREN[model.name] ?? []) {
      const child = getModel(childName);
      const memo = new Map<string, Row[]>();
      const children = await load(child, memo, foreignKeyName, row.id);
      for (const item of children) await deleteRecord(child, item);
    }
    await getFirebaseAdminDb().collection(delegateName(model.name)).doc(String(row.id)).delete();
  }

  function delegate(model: Model) {
    return {
      findMany: (args?: Args) => find(model, args),
      findFirst: (args?: Args) => find(model, args, true),
      findFirstOrThrow: async (args?: Args) => { const row = await find(model, args, true); if (!row) throw new Error(`${model.name} not found`); return row; },
      findUnique: (args?: Args) => find(model, args, true),
      findUniqueOrThrow: async (args?: Args) => { const row = await find(model, args, true); if (!row) throw new Error(`${model.name} not found`); return row; },
      count: async (args?: Args) => (await find(model, args) as Row[]).length,
      create: (args: Args) => createRecord(model, args),
      createMany: async (args: Args) => { const list = (Array.isArray(args?.data) ? args?.data : [args?.data]) as Row[]; for (const data of list) await createRecord(model, { data }); return { count: list.length }; },
      update: async (args: Args) => { const current = await find(model, { where: args?.where }, true) as Row | null; if (!current) throw new Error(`${model.name} not found`); const id = String(current.id); await write(model, id, withDefaults(model, await applyData(current, args?.data as Row), id, true)); return find(model, { where: { id }, include: args?.include, select: args?.select }, true); },
      updateMany: async (args: Args) => { const rows = await find(model, { where: args?.where }) as Row[]; for (const row of rows) await write(model, String(row.id), await applyData(row, args?.data as Row)); return { count: rows.length }; },
      upsert: async (args: Args) => { const current = await find(model, { where: args?.where }, true) as Row | null; if (!current) return createRecord(model, { data: args?.create, include: args?.include, select: args?.select }); const id = String(current.id); await write(model, id, withDefaults(model, await applyData(current, args?.update as Row), id, true)); return find(model, { where: { id }, include: args?.include, select: args?.select }, true); },
      delete: async (args: Args) => { const current = await find(model, { where: args?.where }, true) as Row | null; if (!current) throw new Error(`${model.name} not found`); await deleteRecord(model, current); return current; },
      deleteMany: async (args?: Args) => { const rows = await find(model, { where: args?.where }) as Row[]; for (const row of rows) await deleteRecord(model, row); return { count: rows.length }; },
      groupBy: async (args: Args) => {
        const rows = await find(model, { where: args?.where }) as Row[];
        const by = args?.by as string[];
        const groups = new Map<string, Row[]>();
        for (const row of rows) { const key = JSON.stringify(by.map((field) => row[field])); groups.set(key, [...(groups.get(key) ?? []), row]); }
        return [...groups.values()].map((items) => ({ ...Object.fromEntries(by.map((field) => [field, items[0][field]])), _count: { _all: items.length } }));
      },
    };
  }

  const facade = new Proxy({
    $transaction: async (operations: Promise<unknown>[] | ((client: PrismaClient) => Promise<unknown>)) => typeof operations === "function" ? operations(facade as unknown as PrismaClient) : Promise.all(operations),
    $disconnect: async () => undefined,
  } as Row, {
    get(target, property: string) {
      if (property in target) return target[property];
      const model = models.get(modelName(property));
      if (!model) return undefined;
      return delegate(model);
    },
  });

  return facade as unknown as PrismaClient;
}
