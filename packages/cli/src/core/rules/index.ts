import { Rule } from '../types';
import { tokenRules } from './tokens';
import { componentRules } from './components';
import { tokenBypassRule } from './token-bypass/rule';
import { driftRule } from './drift/rule';

export const allRules: Rule[] = [
  ...tokenRules,
  ...componentRules,
  tokenBypassRule,
  driftRule,
];

export { tokenRules } from './tokens';
export { componentRules } from './components';
export { tokenBypassRule } from './token-bypass/rule';
export { driftRule } from './drift/rule';
