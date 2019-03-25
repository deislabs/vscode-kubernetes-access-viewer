import * as vscode from 'vscode';

import * as config from '../config/config';
import { Errorable } from '../utils/errorable';
import * as shell from '../utils/shell';
import { WhoCanInfo, parseWhoCanOutput } from './whocan.apimodel';

const logChannel = vscode.window.createOutputChannel("Who Can");

// TODO: some deduplicating!
async function invokeObj<T>(sh: shell.Shell, args: string, opts: shell.ExecOpts, fn: (stdout: string) => T): Promise<Errorable<T>> {
    const bin = config.whocanPath() || 'kubectl-who-can';
    const cmd = `${bin} ${args}`;
    logChannel.appendLine(`$ ${cmd}`);
    return await sh.execObj<T>(
        cmd,
        `kubectl-who-can`,
        opts,
        andLog(fn)
    );
}

function andLog<T>(fn: (s: string) => T): (s: string) => T {
    return (s: string) => {
        logChannel.appendLine(s);
        return fn(s);
    };
}

export async function whoCan(sh: shell.Shell, action: string, resource: string): Promise<Errorable<WhoCanInfo>> {
    return invokeObj(sh, `${action} ${resource}`, {}, parseWhoCanOutput);
}
