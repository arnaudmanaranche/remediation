import { Rule } from '../types';
import { tokenRules } from './tokens';
import { tokenBypassRule } from './token-bypass/rule';
import { driftRule } from './drift/rule';

export const allRules: Rule[] = [
  ...tokenRules,
  tokenBypassRule,
  driftRule,
];
