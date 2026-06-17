import { Rule } from '../../types';
import { colorsRule } from './colors/rule';
import { spacingRule } from './spacing/rule';
import { typographyRule } from './typography/rule';

export const tokenRules: Rule[] = [
  colorsRule,
  spacingRule,
  typographyRule,
];

export { colorsRule } from './colors/rule';
export { spacingRule } from './spacing/rule';
export { typographyRule } from './typography/rule';
