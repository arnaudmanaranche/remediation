import { Rule } from '../types';
import { tokenRules } from './tokens';
import { componentRules } from './components';

export const allRules: Rule[] = [
  ...tokenRules,
  ...componentRules,
];

export { tokenRules } from './tokens';
export { componentRules } from './components';
