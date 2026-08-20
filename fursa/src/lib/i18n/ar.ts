/**
 * English → Arabic dictionary. Keys are the exact rendered English string with
 * whitespace collapsed; see `translate.ts` for how they are matched.
 */
import { common } from "./ar.common";
import { publicSite } from "./ar.public";
import { student } from "./ar.student";
import { employer } from "./ar.employer";
import { university } from "./ar.university";
import { admin } from "./ar.admin";
import { policies } from "./ar.policies";
import { standards } from "./ar.standards";
import { walkthrough } from "./ar.walkthrough";

export const ar: Record<string, string> = {
  ...common,
  ...publicSite,
  ...student,
  ...employer,
  ...university,
  ...admin,
  ...policies,
  ...standards,
  ...walkthrough,
};
