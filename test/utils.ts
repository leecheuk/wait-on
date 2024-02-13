
import childProcess, { ExecOptions } from 'child_process';

/**
 * @note Requires a built CLI script
 */
export function execCLI(args: ExecOptions, options?: any) {
  return childProcess.exec('../bin/wait-on', args, options);
}
