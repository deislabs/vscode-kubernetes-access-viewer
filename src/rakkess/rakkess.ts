import * as vscode from 'vscode';

import * as config from '../config/config';
import { Errorable } from '../utils/errorable';
import * as shell from '../utils/shell';
import { parseRakkessOutput, Access } from './rakkess.apimodel';

const logChannel = vscode.window.createOutputChannel("Rakkess");

async function invokeObj<T>(sh: shell.Shell, args: string, opts: shell.ExecOpts, fn: (stdout: string) => T): Promise<Errorable<T>> {
    const bin = config.rakkessPath() || 'rakkess';
    const cmd = `${bin} ${args}`;
    logChannel.appendLine(`$ ${cmd}`);
    return await sh.execObj<T>(
        cmd,
        `rakkess`,
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

export function access(sh: shell.Shell, namespace: string | undefined): Promise<Errorable<Access>> {
    const nsarg = namespace ? `--namespace ${namespace}` : '';
    return invokeObj(sh, `${nsarg} --verbs get,list,watch,create,update,delete,proxy --output ascii-table`, {}, parseRakkessOutput);
}
