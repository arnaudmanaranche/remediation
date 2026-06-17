import { Transform, Violation, FileContent } from '../../../types';

export const duplicatesTransform: Transform = {
  name: 'components/duplicates',

  fix(violation: Violation, file: FileContent): string {
    return file.content;
  },
};
