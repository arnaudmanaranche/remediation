import { Rule } from '../../types';
import { deadComponentsRule } from './dead/rule';
import { duplicatesRule } from './duplicates/rule';

export const componentRules: Rule[] = [
  deadComponentsRule,
  duplicatesRule,
];

export { deadComponentsRule } from './dead/rule';
export { duplicatesRule } from './duplicates/rule';
