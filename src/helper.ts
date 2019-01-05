import { exec as cpExec, ExecException } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';

export const exists = promisify(fs.exists);
export const mkdir = promisify(fs.mkdir);

export const exec = (command: string, options = {}) => new Promise((resolve, reject) => 
  cpExec(command, options, (error: ExecException | null, stdout: string, stderr: string) => {
    if (!error) {
      return resolve(stdout);
    }
    return reject(stderr);
  })
);