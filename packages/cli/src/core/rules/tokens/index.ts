import { Rule } from '../../types';
import { colorsRule } from './colors/rule';
import { spacingRule } from './spacing/rule';
import { typographyRule } from './typography/rule';
import { radiusRule } from './radius/rule';
import { shadowsRule } from './shadows/rule';

export const tokenRules: Rule[] = [
  colorsRule,
  spacingRule,
  typographyRule,
  radiusRule,
  shadowsRule,
];

export { colorsRule } from './colors/rule';
export { spacingRule } from './spacing/rule';
export { typographyRule } from './typography/rule';
export { radiusRule } from './radius/rule';
export { shadowsRule } from './shadows/rule';
