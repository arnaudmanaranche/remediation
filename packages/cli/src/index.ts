#!/usr/bin/env node

import { program } from './commands/run';
import { registerAnalyzeCommand } from './commands/analyze';
import { registerInitCommand } from './commands/init';

registerAnalyzeCommand(program);
registerInitCommand(program);
program.parse();
