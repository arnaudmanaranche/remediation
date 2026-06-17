import { Rule, FileContent, Violation } from '../../../types';

const VARIANT_PROPS = ['variant', 'size', 'type', 'kind'];

const propPattern = (props: string[]) =>
  new RegExp(
    `(?:function\\s+\\w+\\s*\\(|const\\s+\\w+\\s*=\\s*(?:\\([^)]*\\)|\\w+)\\s*=>|const\\s+\\w+\\s*=\\s*\\()\\s*\\{\\s*(?:${props.join('|')})\\b`,
    'g'
  );

const ternaryPattern = (props: string[]) =>
  new RegExp(
    `\\b(${props.join('|')})\\s*(?:===?|!==?)\\s*['"][^'"]+['"]\\s*\\?`,
    'g'
  );

const switchPattern = (props: string[]) =>
  new RegExp(
    `switch\\s*\\(\\s*(${props.join('|')})\\s*\\)`,
    'g'
  );

function findPropsInFile(content: string): string[] {
  const found: string[] = [];

  for (const prop of VARIANT_PROPS) {
    const regex = propPattern([prop]);
    if (regex.test(content)) {
      found.push(prop);
    }
  }

  return found;
}

function findVariantsOnProp(content: string, prop: string): Array<{ line: number; column: number; message: string }> {
  const issues: Array<{ line: number; column: number; message: string }> = [];
  const lines = content.split('\n');

  const ternaryOnProp = new RegExp(
    `\\b${prop}\\s*(?:===?|!==?)\\s*['"][^'"]+['"]\\s*\\?`,
    'g'
  );

  const ternaryShorthand = new RegExp(
    `\\b${prop}\\s*\\?`,
    'g'
  );

  const sw = new RegExp(
    `switch\\s*\\(\\s*${prop}\\s*\\)`,
    'g'
  );

  const ternaryConditionOnly = new RegExp(
    `\\b${prop}\\s*(?:===?|!==?)\\s*['"][^'"]+['"]`,
    'g'
  );

  lines.forEach((line, index) => {
    let match: RegExpExecArray | null;

    ternaryOnProp.lastIndex = 0;
    while ((match = ternaryOnProp.exec(line)) !== null) {
      issues.push({
        line: index + 1,
        column: match.index + 1,
        message: `Conditional rendering based on ${prop}`,
      });
    }

    ternaryShorthand.lastIndex = 0;
    while ((match = ternaryShorthand.exec(line)) !== null) {
      const alreadyFound = issues.some(i => i.line === index + 1 && i.column <= match!.index + 10);
      if (!alreadyFound) {
        issues.push({
          line: index + 1,
          column: match.index + 1,
          message: `Conditional rendering based on ${prop}`,
        });
      }
    }

    sw.lastIndex = 0;
    while ((match = sw.exec(line)) !== null) {
      issues.push({
        line: index + 1,
        column: match.index + 1,
        message: `Switch statement on ${prop}`,
      });
    }

    ternaryConditionOnly.lastIndex = 0;
    while ((match = ternaryConditionOnly.exec(line)) !== null) {
      const nextLine = lines[index + 1];
      if (nextLine && nextLine.trim().startsWith('?')) {
        const alreadyFound = issues.some(i => i.line === index + 1);
        if (!alreadyFound) {
          issues.push({
            line: index + 1,
            column: match.index + 1,
            message: `Conditional rendering based on ${prop}`,
          });
        }
      }
    }
  });

  return issues;
}

export const variantSplitRule: Rule = {
  name: 'components/variant-split',
  description: 'Detects components with conditional rendering based on variant props that should be split',

  detect(file: FileContent): Violation[] {
    const violations: Violation[] = [];

    if (!file.path.match(/\.(tsx?|jsx?)$/)) {
      return violations;
    }

    const propsInFile = findPropsInFile(file.content);

    for (const prop of propsInFile) {
      const issues = findVariantsOnProp(file.content, prop);

      for (const issue of issues) {
        violations.push({
          rule: 'components/variant-split',
          file: file.path,
          line: issue.line,
          column: issue.column,
          message: `${issue.message} — consider splitting into separate components`,
          severity: 'warning',
          suggestion: `Split into separate components based on ${prop} values`,
        });
      }
    }

    return violations;
  },
};
