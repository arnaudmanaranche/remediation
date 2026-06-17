import { Transform, Violation, FileContent } from '../../../types';

export const spacingTransform: Transform = {
  name: 'spacing/hardcoded',

  fix(violation: Violation, file: FileContent): string {
    const lines = file.content.split('\n');
    const lineIndex = violation.line - 1;

    if (lineIndex >= lines.length) {
      return file.content;
    }

    const line = lines[lineIndex];
    const valueMatch = violation.message.match(/Hardcoded \w+ spacing: (.+)/);

    if (!valueMatch) {
      return file.content;
    }

    const oldValue = valueMatch[1];
    const suggestion = violation.suggestion;

    if (!suggestion) {
      return file.content;
    }

    const tokenMatch = suggestion.match(/Use (.+) instead/);
    if (!tokenMatch) {
      return file.content;
    }

    const tokenName = tokenMatch[1];
    const newValue = `{${tokenName}}`;

    lines[lineIndex] = line.replace(oldValue, newValue);

    return lines.join('\n');
  },
};
