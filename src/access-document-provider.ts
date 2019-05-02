import * as vscode from 'vscode';

import * as rakkess from './rakkess/rakkess';
import { longRunning } from './utils/host';
import { shell } from './utils/shell';
import { KindPermission, KindPermissions, Access } from './rakkess/rakkess.apimodel';
import { failed } from './utils/errorable';

export const ACCESS_SCHEME = 'rakkess';
const CLUSTER_AUTHORITY = 'cluster';
const NAMESPACE_AUTHORITY = 'namespace';

export function clusterUri(): vscode.Uri {
    return vscode.Uri.parse(`${ACCESS_SCHEME}://${CLUSTER_AUTHORITY}/?${nonce()}`);
}

export function namespaceUri(namespace: string): vscode.Uri {
    return vscode.Uri.parse(`${ACCESS_SCHEME}://${NAMESPACE_AUTHORITY}/${namespace}?${nonce()}`);
}

const DOCUMENT_MAP: { [key: string]: string } = {};

export class AccessDocumentProvider implements vscode.TextDocumentContentProvider {
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
    const namespace = (uri.authority === NAMESPACE_AUTHORITY) ? uri.path.substring(1) : undefined;
    const access = await longRunning('Rakkess is retrieving access info...', () =>
        rakkess.access(shell, namespace)
    );

    if (failed(access)) {
        return `Error loading access information: ${access.error[0]}`;
    }

    return formatMarkdown(access.result);
}

function formatMarkdown(access: Access): string {
    function header(): string {
        const columns = ['Resource Type', ...access.verbs];
        const row1 = `| ${columns.join(' | ')} |`;
        const row2 = `|${columns.map((_) => '---').join('|')}|`;
        return `${row1}\n${row2}`;
    }
    function row(kind: string, permissions: KindPermissions): string {
        const permissionTexts = access.verbs.map((v) => permissions[v]).map(permissionText);
        const cells = [`\`${kind}\``, ...permissionTexts];
        return `| ${cells.join(' | ')} |`;
    }
    const rows = Object.keys(access.permissions)
                       .map((k) => row(k, access.permissions[k]))
                       .join('\n');
    return `${header()}\n${rows}`;
}

function permissionText(p: KindPermission): string {
    switch (p) {
        case KindPermission.Allowed: return "<span style='color: lime'>yes</span>";
        case KindPermission.Denied: return "<span style='color: palevioletred'>no</span>";
        case KindPermission.NotApplicable: return "<span style='color: silver'>_n/a_</span>";
        case KindPermission.Error: return "**error**";
    }
}

function nonce(): string {
    return Math.random().toString().replace('.', 'x');  // it doesn't need to be cryptographically random dash it all
}