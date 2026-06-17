import { Transform, Violation, FileContent } from '../../../types';

export const deadComponentsTransform: Transform = {
  name: 'components/dead',

  fix(violation: Violation, file: FileContent): string {
    return file.content;
  },
};
