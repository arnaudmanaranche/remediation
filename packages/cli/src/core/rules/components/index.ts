import { Rule } from '../../types';
import { deadComponentsRule } from './dead/rule';
import { duplicatesRule } from './duplicates/rule';
import { variantSplitRule } from './variant-split/rule';

export const componentRules: Rule[] = [
  deadComponentsRule,
  duplicatesRule,
  variantSplitRule,
];

export { deadComponentsRule } from './dead/rule';
export { duplicatesRule } from './duplicates/rule';
export { variantSplitRule } from './variant-split/rule';
