import { Transform } from '../types';
import { colorsTransform } from '../rules/tokens/colors/transform';
import { spacingTransform } from '../rules/tokens/spacing/transform';
import { typographyTransform } from '../rules/tokens/typography/transform';

export const allTransforms: Transform[] = [
  colorsTransform,
  spacingTransform,
  typographyTransform,
];

export function getTransformsMap(): Map<string, Transform> {
  const map = new Map<string, Transform>();
  for (const transform of allTransforms) {
    map.set(transform.name, transform);
  }
  return map;
}

export { colorsTransform } from '../rules/tokens/colors/transform';
export { spacingTransform } from '../rules/tokens/spacing/transform';
export { typographyTransform } from '../rules/tokens/typography/transform';
