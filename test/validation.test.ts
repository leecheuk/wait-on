import waitOn from '../lib/wait-on';
import childProcess, { ExecOptions } from 'child_process';
import { describe, expect, it } from 'vitest'

function execCLI(args: ExecOptions, options?: any) {
  return childProcess.exec('../bin/wait-on', args, options);
}

describe('validation', function () {
  describe('API', function () {
    it('should callback with error when resources property is omitted', () => {
      const opts: any = {};
      waitOn(opts, function (err) {
        expect(err).toBeTruthy();
      });
    });

    it('should callback with error when no resources are provided', () => {
      const opts = { resources: [] };
      waitOn(opts, function (err) {
        expect((err as Error).toString()).toContain('"resources" does not contain 1 required value(s)');
      });
    });

    it('should return error when opts is null', () => {
      waitOn(null as any, function (err) {
        expect(err).toBeTruthy();
      });
    });
  });

  describe('CLI', function () {
    it('should exit with non-zero error code when no resources provided', () => {
      execCLI([] as ExecOptions).on('exit', function (code: any) {
        expect(code).not.toBe(0);
      });
    });
  });
});
