import { DetectedComponent } from './detector';

export type ArchetypeId =
  | 'button'
  | 'iconButton'
  | 'card'
  | 'badge'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'skeleton'
  | 'avatar'
  | 'divider'
  | 'spinner';

// Token-bearing style slots an archetype exposes as constrained props. The
// union each slot resolves to depends on which token group exists in the
// project (ColorName, Spacing, FontSizeName, FontWeightName).
export type TokenSlot =
  | 'backgroundColor'
  | 'borderColor'
  | 'color'
  | 'padding'
  | 'margin'
  | 'gap'
  | 'fontSize'
  | 'fontWeight';

export interface Archetype {
  id: ArchetypeId;
  componentName: string;
  slots: TokenSlot[];
  element: string;
  elementAttrs?: Record<string, string>;
  voidElement?: boolean;
  textChild?: boolean;
}

const ELEMENT_ATTRS = {
  button: { type: 'button' },
  checkbox: { type: 'checkbox' },
  radio: { type: 'radio' },
  switch: { type: 'button', role: 'switch' },
  skeleton: { 'aria-hidden': 'true' },
  spinner: { role: 'status' },
} as const;

const ARCHETYPES: Archetype[] = [
  { id: 'button', componentName: 'Button', slots: ['backgroundColor', 'color', 'padding', 'fontSize', 'fontWeight', 'gap'], element: 'button', elementAttrs: ELEMENT_ATTRS.button, textChild: true },
  { id: 'iconButton', componentName: 'IconButton', slots: ['backgroundColor', 'color', 'padding'], element: 'button', elementAttrs: ELEMENT_ATTRS.button },
  { id: 'card', componentName: 'Card', slots: ['backgroundColor', 'borderColor', 'color', 'padding', 'margin', 'gap'], element: 'div', textChild: true },
  { id: 'badge', componentName: 'Badge', slots: ['backgroundColor', 'color', 'padding', 'fontSize', 'fontWeight'], element: 'span', textChild: true },
  { id: 'input', componentName: 'Input', slots: ['backgroundColor', 'borderColor', 'color', 'padding', 'fontSize'], element: 'input', voidElement: true },
  { id: 'select', componentName: 'Select', slots: ['backgroundColor', 'borderColor', 'color', 'padding', 'fontSize'], element: 'select', textChild: true },
  { id: 'checkbox', componentName: 'Checkbox', slots: ['borderColor', 'color', 'gap'], element: 'input', elementAttrs: ELEMENT_ATTRS.checkbox, voidElement: true },
  { id: 'radio', componentName: 'Radio', slots: ['borderColor', 'color'], element: 'input', elementAttrs: ELEMENT_ATTRS.radio, voidElement: true },
  { id: 'switch', componentName: 'Switch', slots: ['backgroundColor', 'color', 'padding'], element: 'button', elementAttrs: ELEMENT_ATTRS.switch, textChild: true },
  { id: 'skeleton', componentName: 'Skeleton', slots: ['backgroundColor'], element: 'div', elementAttrs: ELEMENT_ATTRS.skeleton },
  { id: 'avatar', componentName: 'Avatar', slots: ['backgroundColor'], element: 'div' },
  { id: 'divider', componentName: 'Divider', slots: ['borderColor', 'margin'], element: 'hr', voidElement: true },
  { id: 'spinner', componentName: 'Spinner', slots: ['color', 'borderColor'], element: 'div', elementAttrs: ELEMENT_ATTRS.spinner },
];

export const CATALOG_ORDER: ArchetypeId[] = ARCHETYPES.map(a => a.id);

export function archetypeById(id: ArchetypeId): Archetype {
  const found = ARCHETYPES.find(a => a.id === id);
  if (!found) throw new Error(`Unknown archetype: ${id}`);
  return found;
}

const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'main', 'aside', 'ul', 'li', 'nav']);
const HEADING_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'a']);

// Classify a detected component into at most one archetype. Element tag wins;
// name hints disambiguate within a tag (button vs IconButton, checkbox vs
// switch) and rescue containers (Card/Panel) that are styled divs.
export function classifyComponent(component: DetectedComponent): ArchetypeId | null {
  const root = component.rootTag.toLowerCase();
  const name = component.name.toLowerCase();
  const hint = (...words: string[]) => words.some(word => name.includes(word));
  const attrs = component.rootAttrs;

  if (root === 'input') {
    const inputType = attrs['type'] || 'text';
    if (inputType === 'checkbox') return hint('switch', 'toggle') ? 'switch' : 'checkbox';
    if (inputType === 'radio') return 'radio';
    if (inputType === 'button') return 'button';
    return 'input';
  }

  if (root === 'select') return 'select';
  if (root === 'img') return 'avatar';
  if (root === 'hr') return 'divider';

  if (root === 'button') {
    const iconOnly = !component.hasChildrenJsx && (component.hasSvg || hint('icon'));
    return iconOnly ? 'iconButton' : 'button';
  }

  if (root === 'span') {
    return isPill(component) ? 'badge' : null;
  }

  if (HEADING_TAGS.has(root)) return null;

  const isContainer = CONTAINER_TAGS.has(root) || /^[A-Z]/.test(root);
  if (!isContainer) return null;

  if (hint('skeleton', 'placeholder')) return 'skeleton';
  if (hint('spinner', 'loader', 'loading')) return 'spinner';
  if (hint('avatar')) return 'avatar';
  if (hint('separator')) return 'divider';
  if (hint('badge', 'tag', 'chip', 'alert', 'status')) return 'badge';
  if (isPill(component)) return 'badge';
  if (hint('card', 'panel', 'box')) return 'card';
  if (hasCardShape(component)) return 'card';
  if (!component.hasChildrenJsx && hasDividerBorder(component)) return 'divider';

  return null;
}

function isPill(component: DetectedComponent): boolean {
  return component.styleValues.some(sv => {
    if (sv.cssProperty !== 'borderRadius') return false;
    return /^9999(px)?$/.test(sv.rawValue.trim()) || sv.rawValue.trim() === '50%';
  });
}

function hasCardShape(component: DetectedComponent): boolean {
  const props = new Set(component.styleValues.map(sv => sv.cssProperty));
  const solid = props.has('backgroundColor');
  const framed = props.has('border') || props.has('borderRadius') || props.has('boxShadow');
  const pads = props.has('padding') || props.has('paddingTop');
  return solid && framed && pads;
}

function hasDividerBorder(component: DetectedComponent): boolean {
  return component.styleValues.some(sv => sv.cssProperty === 'borderTop' || sv.cssProperty === 'borderBottom');
}