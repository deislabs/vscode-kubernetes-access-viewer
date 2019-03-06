'use strict';

import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

import * as rakkess from './rakkess/rakkess';
import { shell } from './utils/shell';
import { failed } from './utils/errorable';
import { Access, KindPermissions, KindPermission } from './rakkess/rakkess.apimodel';
import { longRunning } from './utils/host';

const OPEN_PREVIEWS: { [key: string]: string } = {};

let commandTargetResolver: k8s.CommandTargetsV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {
    const commandTargets = await k8s.extension.commandTargets.v1;
    if (commandTargets.available) {
        commandTargetResolver = commandTargets.api;
    } else {
        vscode.window.showErrorMessage("Unable to access Kubernetes extension");  // TODO: better error message
    }

    const subscriptions = [
        vscode.commands.registerCommand('k8saccessviewer.showAccess', showAccess),
        vscode.workspace.registerTextDocumentContentProvider('rakkess', new CachedMarkdownDocumentProvider()),
    ];

    context.subscriptions.push(...subscriptions);
}

async function showAccess(target?: any) {
    const namespace = targetNamespace(target);
    const access = await longRunning('Rakkess is retrieving access info...', () =>
        rakkess.access(shell, namespace)
    );
    if (failed(access)) {
        await vscode.window.showErrorMessage(access.error[0]);
        return;
    }

    const guid = Math.random().toString().replace('.', 'x');
    OPEN_PREVIEWS[guid] = formatMarkdown(access.result);
    // const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(`rakkess://r/${guid}.md`));
    // await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.parse(`rakkess://r/${guid}.md`));
}

class CachedMarkdownDocumentProvider implements vscode.TextDocumentContentProvider {
    onDidChange?: vscode.Event<vscode.Uri> | undefined;
    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const guid = uri.path.substring(1).replace('.md', '');
        return OPEN_PREVIEWS[guid];
    }
}

function targetNamespace(commandTarget: any): string | undefined {
    if (!commandTarget) {
        return undefined;
    }
    if (!commandTargetResolver) {
        return undefined;
    }

    const target = commandTargetResolver.resolve(commandTarget);
    if (target && target.targetType === 'kubernetes-explorer-node') {
        const node = target.node;
        if (node.nodeType === 'resource' && node.resourceKind.manifestKind === 'Namespace') {
            // Technically we don't need to check the resource kind as we never display
            // the menu item for any other kind of resource. But this shows an example of
            // how to do it!
            return node.name;
        }
    }

    return undefined;
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
