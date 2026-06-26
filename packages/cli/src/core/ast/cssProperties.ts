export const COLOR_PROPS = new Set([
  'color', 'background', 'backgroundColor',
  'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'outlineColor', 'textDecorationColor', 'caretColor', 'columnRuleColor',
  'fill', 'stroke', 'stopColor', 'floodColor', 'lightingColor',
  'boxShadow', 'textShadow',
]);

export const SPACING_PROPS = new Set([
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'marginInline', 'marginBlock', 'marginInlineStart', 'marginInlineEnd',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'paddingInline', 'paddingBlock', 'paddingInlineStart', 'paddingInlineEnd',
  'gap', 'rowGap', 'columnGap',
  'top', 'right', 'bottom', 'left',
  'inset', 'insetInline', 'insetBlock',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'flexBasis', 'gridGap', 'gridRowGap', 'gridColumnGap',
]);

export const TYPOGRAPHY_PROPS = new Set([
  'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'fontFamily',
]);

export const RADIUS_PROPS = new Set([
  'borderRadius',
  'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
]);

export const SHADOW_PROPS = new Set([
  'boxShadow', 'textShadow', 'filter',
]);

export const ALL_STYLE_PROPS = new Set([
  ...COLOR_PROPS, ...SPACING_PROPS, ...TYPOGRAPHY_PROPS, ...RADIUS_PROPS, ...SHADOW_PROPS,
]);
