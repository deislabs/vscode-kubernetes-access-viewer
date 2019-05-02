import * as vscode from 'vscode';

import * as whocan from './whocan/whocan';
import { longRunning } from './utils/host';
import { shell } from './utils/shell';
import { failed } from './utils/errorable';
import { WhoCanInfo, RoleBinding, ClusterRoleBinding } from './whocan/whocan.apimodel';

export const WHOCAN_SCHEME = 'whocan';

export function uri(verb: string, resource: string): vscode.Uri {
    return vscode.Uri.parse(`${WHOCAN_SCHEME}://${verb}/${resource}?${nonce()}`);
}

// TODO: deduplicate background load plumbing
const DOCUMENT_MAP: { [key: string]: string } = {};

export class WhoCanDocumentProvider implements vscode.TextDocumentContentProvider {
    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEmitter.event;
    }

    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const data = DOCUMENT_MAP[uri.query];
        if (data) {
            delete DOCUMENT_MAP[uri.query];
            return data;
        }
        backgroundLoadDocumentContent(uri, this.onDidChangeEmitter);
        return "## Loading...";
    }
}

async function backgroundLoadDocumentContent(uri: vscode.Uri, eventEmitter: vscode.EventEmitter<vscode.Uri>): Promise<void> {
    const content = await provideTextDocumentContent(uri);
    DOCUMENT_MAP[uri.query] = content;
    eventEmitter.fire(uri);
}

async function provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const resource = uri.path.substring(1);
    const verb = uri.authority;
    const whoCanInfo = await longRunning('kubectl-who-can is retrieving permissions info...', () =>
        whocan.whoCan(shell, verb, resource)
    );

    if (failed(whoCanInfo)) {
        return `Error loading permissions information: ${whoCanInfo.error[0]}`;
    }

    return formatMarkdown(whoCanInfo.result, verb, resource);
}

function formatMarkdown(whoCanInfo: WhoCanInfo, verb: string, resource: string): string {
    if (whoCanInfo.roleBindings.length === 0 && whoCanInfo.clusterRoleBindings.length === 0) {
        return `**No subjects have permissions to ${verb} ${resource} though either role or cluster role bindings**`;
    }
    const header = [`## Subjects with permission to ${verb} ${resource}`, '| Type | Who | How |', '|---|---|---|'];
    const rbRows = formatRoleBindingMarkdown(whoCanInfo.roleBindings);
    const crbRows = formatClusterRoleBindingMarkdown(whoCanInfo.clusterRoleBindings);
    const rows = rbRows.concat(crbRows).sort();
    return header.concat(rows).join('\n');
}

function formatRoleBindingMarkdown(bindings: ReadonlyArray<RoleBinding>): string[] {
    return bindings.map((b) => `| ${b.subjectType} | ${nsPrefix(b.subjectNamespace)}${b.subject} | RoleBinding ${nsPrefix(b.roleBindingNamespace)}${b.roleBinding} |`);
}

function formatClusterRoleBindingMarkdown(bindings: ReadonlyArray<ClusterRoleBinding>): string[] {
    return bindings.map((b) => `| ${b.subjectType} | ${nsPrefix(b.subjectNamespace)}${b.subject} | ClusterRoleBinding ${b.clusterRoleBinding} |`);
}

function nonce(): string {
    return Math.random().toString().replace('.', 'x');  // it doesn't need to be cryptographically random dash it all
}

function nsPrefix(ns: string | null): string {
    if (!ns || ns.length === 0) {
        return '';
    }
    return ns + '/';
}
