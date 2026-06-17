#!/usr/bin/env node

import { program } from './commands/run';
import { registerAnalyzeCommand } from './commands/analyze';

registerAnalyzeCommand(program);
program.parse();
