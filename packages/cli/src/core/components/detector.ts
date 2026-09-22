import * as fs from 'fs';
import * as path from 'path';
import * as parser from '@babel/parser';
import { shouldIgnoreFile } from '../config';
import { ALL_STYLE_PROPS } from '../ast/cssProperties';
import { walk, getPropertyName, getStringValue, getNumericValue } from '../ast/extractor';

interface DetectedStyleValue {
  cssProperty: string;
  rawValue: string;
}

export interface DetectedComponent {
  name: string;
  file: string;
  rootTag: string;
  rootAttrs: Record<string, string>;
  elements: string[];
  hasSvg: boolean;
  hasChildrenJsx: boolean;
  styleValues: DetectedStyleValue[];
}

type AstNode = {
  type: string;
  start?: number | null;
  end?: number | null;
  [key: string]: unknown;
};

export function collectSourceFiles(projectPath: string, ignore: string[] = []): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (shouldIgnoreFile(fullPath, ignore)) continue;
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') traverse(fullPath);
      } else if (/\.(tsx|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  traverse(projectPath);
  return files;
}

export function detectComponents(files: string[]): DetectedComponent[] {
  const components: DetectedComponent[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    components.push(...detectComponentsInSource(content, file));
  }

  return components;
}

export function detectComponentsInSource(content: string, file: string): DetectedComponent[] {
  let ast: AstNode;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      errorRecovery: true,
      strictMode: false,
    }) as unknown as AstNode;
  } catch {
    return [];
  }

  const fallbackName = path.basename(file, path.extname(file));
  const found: DetectedComponent[] = [];

  walk(ast, (node) => {
    const candidate = componentCandidate(node, file, fallbackName);
    if (!candidate) return;

    const structure = inspectJsx(candidate.body);
    if (!structure.hasJsx) return;

    const styleValues = collectStyleValues(candidate.body, structure.rootElement);
    if (styleValues.length === 0) return;

    found.push({
      name: candidate.name,
      file,
      rootTag: structure.rootTag,
      rootAttrs: structure.rootAttrs,
      elements: structure.elements,
      hasSvg: structure.hasSvg,
      hasChildrenJsx: structure.hasChildrenJsx,
      styleValues,
    });
  });

  return found;
}

interface ComponentCandidate {
  name: string;
  body: AstNode;
}

function componentCandidate(node: AstNode, file: string, fallbackName: string): ComponentCandidate | null {
  let name: string | null = null;
  let body: AstNode | null = null;

  if (node.type === 'FunctionDeclaration') {
    const id = node.id as AstNode | null;
    name = id?.type === 'Identifier' ? (id.name as string) : null;
    body = node.body as AstNode;
  } else if (node.type === 'VariableDeclaration') {
    for (const declaration of node.declarations as AstNode[]) {
      const init = declaration.init as AstNode;
      if (!init || init.type !== 'ArrowFunctionExpression') continue;
      const id = declaration.id as AstNode;
      if (id.type !== 'Identifier') continue;
      name = id.name as string;
      body = init.body as AstNode;
      break;
    }
  } else if (node.type === 'ExportDefaultDeclaration') {
    const declaration = node.declaration as AstNode;
    if (declaration.type === 'FunctionDeclaration') {
      const id = declaration.id as AstNode | null;
      name = id?.type === 'Identifier' ? (id.name as string) : fallbackName;
      body = declaration.body as AstNode;
    } else if (declaration.type === 'ArrowFunctionExpression') {
      name = fallbackName;
      body = declaration.body as AstNode;
    }
  }

  if (!name || !body) return null;
  if (!/^[A-Z]/.test(name)) return null;

  return { name, body };
}

interface JsxStructure {
  hasJsx: boolean;
  rootTag: string;
  rootAttrs: Record<string, string>;
  rootElement: AstNode | null;
  elements: string[];
  hasSvg: boolean;
  hasChildrenJsx: boolean;
}

function inspectJsx(body: AstNode): JsxStructure {
  const structure: JsxStructure = {
    hasJsx: false,
    rootTag: '',
    rootAttrs: {},
    rootElement: null,
    elements: [],
    hasSvg: false,
    hasChildrenJsx: false,
  };

  walk(body, (node) => {
    if (node.type !== 'JSXElement') return;
    const opening = node.openingElement as AstNode;
    const tag = jsxElementTag(opening);
    structure.elements.push(tag.toLowerCase());
    if (tag.toLowerCase() === 'svg') structure.hasSvg = true;

    if (!structure.hasJsx) {
      structure.hasJsx = true;
      structure.rootTag = tag;
      structure.rootAttrs = jsxAttributes(opening);
      structure.rootElement = node;
      const children = node.children as AstNode[];
      structure.hasChildrenJsx = (children || []).some(c => c.type === 'JSXElement' || c.type === 'JSXFragment');
    }
  });

  return structure;
}

function jsxElementTag(opening: AstNode): string {
  const name = opening.name as AstNode;
  if (name.type === 'JSXIdentifier') return name.name as string;
  if (name.type === 'JSXMemberExpression') {
    const object = name.object as AstNode;
    return (name.property as AstNode).name as string;
  }
  return '';
}

function jsxAttributes(opening: AstNode): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of opening.attributes as AstNode[]) {
    if (attr.type !== 'JSXAttribute') continue;
    const name = (attr.name as AstNode).name as string;
    const value = attr.value as AstNode | null;
    if (!value) {
      attrs[name] = 'true';
    } else if (value.type === 'StringLiteral') {
      attrs[name] = value.value as string;
    } else if (value.type === 'JSXExpressionContainer') {
      const expr = value.expression as AstNode;
      if (expr.type === 'StringLiteral') attrs[name] = expr.value as string;
    }
  }
  return attrs;
}

function collectStyleValues(body: AstNode, rootElement: AstNode | null): DetectedStyleValue[] {
  const fromRoot = rootElement ? styleValuesInElement(rootElement) : [];
  if (fromRoot.length > 0) return fromRoot;

  const values: DetectedStyleValue[] = [];
  walk(body, (node) => {
    if (node.type !== 'JSXElement') return;
    values.push(...styleValuesInElement(node));
  });
  return values;
}

function styleValuesInElement(element: AstNode): DetectedStyleValue[] {
  const opening = element.openingElement as AstNode;
  const attrs = opening.attributes as AstNode[];
  const styleAttr = attrs.find(
    (a) =>
      a.type === 'JSXAttribute' &&
      (a.name as AstNode).type === 'JSXIdentifier' &&
      (a.name as AstNode).name === 'style'
  );
  if (!styleAttr) return [];

  const value = styleAttr.value as AstNode | null;
  let obj: AstNode | null = null;
  if (value?.type === 'JSXExpressionContainer') {
    obj = value.expression as AstNode;
  } else if (value?.type === 'ObjectExpression') {
    obj = value;
  }
  if (!obj || obj.type !== 'ObjectExpression') return [];

  const values: DetectedStyleValue[] = [];
  walk(obj, (node) => {
    if (node.type !== 'ObjectProperty') return;
    const key = node.key as AstNode;
    const propertyValue = node.value as AstNode;
    const propName = getPropertyName(key);
    if (!propName || !ALL_STYLE_PROPS.has(propName)) return;

    const rawValue = styleValueString(propertyValue);
    if (rawValue === null) return;

    values.push({ cssProperty: propName, rawValue });
  });

  return values;
}

function styleValueString(value: AstNode): string | null {
  const str = getStringValue(value);
  if (str !== null) return str;
  const num = getNumericValue(value);
  if (num !== null) return num;
  return null;
}