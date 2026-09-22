import { describe, it, expect } from 'vitest';
import { detectComponentsInSource } from './detector';

describe('detectComponentsInSource', () => {
  it('detects a PascalCase function component using its root style attribute', () => {
    const src = `
export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '6px' }}
    >
      {children}
    </button>
  );
}
`;
    const components = detectComponentsInSource(src, 'Button.tsx');
    expect(components).toHaveLength(1);
    const button = components[0];
    expect(button.name).toBe('Button');
    expect(button.rootTag).toBe('button');
    expect(button.rootAttrs).toMatchObject({ type: 'button' });
    expect(button.styleValues).toEqual(
      expect.arrayContaining([
        { cssProperty: 'backgroundColor', rawValue: '#2563eb' },
        { cssProperty: 'color', rawValue: '#fff' },
        { cssProperty: 'padding', rawValue: '8px 16px' },
        { cssProperty: 'borderRadius', rawValue: '6px' },
      ])
    );
  });

  it('detects an arrow-function const component', () => {
    const src = `
const Avatar = ({ name }: { name: string }) => (
  <div style={{ width: '32px', height: '32px', borderRadius: '9999px', backgroundColor: '#e4e4e7' }} />
);
`;
    const components = detectComponentsInSource(src, 'Avatar.tsx');
    expect(components).toHaveLength(1);
    expect(components[0].name).toBe('Avatar');
    expect(components[0].elements).toContain('div');
  });

  it('ignores non-component functions and components without styles', () => {
    const src = `
export function helper(a: number) { return a * 2; }
export function Unstyled() {
  return <div>hello</div>;
}
`;
    expect(detectComponentsInSource(src, 'misc.tsx')).toEqual([]);
  });

  it('does not attribute style props from data objects outside the root JSX style', () => {
    const src = `
const VARIANTS = {
  info: { bg: '#eff6ff', border: '#93c5fd' },
};

export function Alert({ variant = 'info' }: { variant?: string }) {
  return (
    <div style={{ backgroundColor: '#eff6ff', borderRadius: '6px' }} role="alert">
      <span style={{ color: '#1d4ed8' }}>note</span>
    </div>
  );
}
`;
    const components = detectComponentsInSource(src, 'Alert.tsx');
    expect(components).toHaveLength(1);
    const alert = components[0];
    expect(alert.styleValues).toEqual([
      { cssProperty: 'backgroundColor', rawValue: '#eff6ff' },
      { cssProperty: 'borderRadius', rawValue: '6px' },
    ]);
  });

  it('falls back to nested style attributes when the root element has none', () => {
    const src = `
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: '18px' }}>Title</h2>
    </div>
  );
}
`;
    const components = detectComponentsInSource(src, 'Card.tsx');
    expect(components).toHaveLength(1);
    expect(components[0].styleValues).toEqual([{ cssProperty: 'fontSize', rawValue: '18px' }]);
  });

  it('captures input type attributes for component classification', () => {
    const src = `
export function Checkbox() {
  return <input type="checkbox" style={{ width: '16px', height: '16px' }} />;
}
`;
    const components = detectComponentsInSource(src, 'Checkbox.tsx');
    expect(components[0].rootAttrs).toMatchObject({ type: 'checkbox' });
    expect(components[0].voidElement).toBe(true);
    expect(components[0].childrenSource).toBeNull();
  });

  it('preserves static JSX children and marks dynamic ones opaque', () => {
    const icon = `
export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
    <path d="M18.3 5.7L5.7 18.3" stroke="currentColor" />
  </svg>
);
`;
    const iconComponents = detectComponentsInSource(icon, 'CloseIcon.tsx');
    expect(iconComponents[0].childrenSource).toContain('<path d="M18.3 5.7L5.7 18.3"');

    const dynamic = `
export function List({ items }: { items: string[] }) {
  return <ul style={{ gap: '8px' }}>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}
`;
    const listComponents = detectComponentsInSource(dynamic, 'List.tsx');
    expect(listComponents[0].childrenSource).toBeNull();
  });

  it('detects svg icon components as icon candidates', () => {
    const src = `
export const CloseIcon = () => (
  <svg style={{ width: '16px', height: '16px' }}><path d="M0 0" /></svg>
);
`;
    const components = detectComponentsInSource(src, 'CloseIcon.tsx');
    expect(components).toHaveLength(1);
    expect(components[0].rootTag).toBe('svg');
    expect(components[0].hasSvg).toBe(true);
  });
});