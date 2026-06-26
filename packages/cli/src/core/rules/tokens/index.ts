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
