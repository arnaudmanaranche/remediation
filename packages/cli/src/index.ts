#!/usr/bin/env node

import { program } from './commands/run';
import { registerAnalyzeCommand } from './commands/analyze';
import { registerInitCommand } from './commands/init';
import { registerDesignCommand } from './commands/design';
import { registerPrimitivesCommand } from './commands/primitives';

registerAnalyzeCommand(program);
registerInitCommand(program);
registerDesignCommand(program);
registerPrimitivesCommand(program);
program.parse();
