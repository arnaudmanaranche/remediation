#!/usr/bin/env node

import { program } from './commands/run';
import { registerAnalyzeCommand } from './commands/analyze';
import { registerInitCommand } from './commands/init';
import { registerDesignCommand } from './commands/design';
import { registerPrimitivesCommand } from './commands/primitives';
import { registerComponentsCommand } from './commands/components';

registerAnalyzeCommand(program);
registerInitCommand(program);
registerDesignCommand(program);
registerPrimitivesCommand(program);
registerComponentsCommand(program);
program.parse();
