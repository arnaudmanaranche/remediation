#!/usr/bin/env node

import { program } from './commands/run';
import { registerAnalyzeCommand } from './commands/analyze';
import { registerInitCommand } from './commands/init';
import { registerDesignCommand } from './commands/design';

registerAnalyzeCommand(program);
registerInitCommand(program);
registerDesignCommand(program);
program.parse();
