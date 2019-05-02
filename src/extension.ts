'use strict';

import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

import { AccessDocumentProvider, ACCESS_SCHEME } from './access-document-provider';
import * as accessDocumentProvider from './access-document-provider';
import { WhoCanDocumentProvider, WHOCAN_SCHEME } from './who-can-document-provider';
import * as whoCanDocumentProvider from './who-can-document-provider';

let clusterExplorer: k8s.ClusterExplorerV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {
    const clusterExplorerAPI = await k8s.extension.clusterExplorer.v1;
    if (clusterExplorerAPI.available) {
        clusterExplorer = clusterExplorerAPI.api;
    } else {
        vscode.window.showErrorMessage("Unable to access Kubernetes extension");  // TODO: better error message
    }

    const subscriptions = [
        vscode.commands.registerCommand('k8saccessviewer.showAccess', showAccess),
        vscode.commands.registerCommand('k8saccessviewer.whoCan', whoCan),
        vscode.workspace.registerTextDocumentContentProvider(ACCESS_SCHEME, new AccessDocumentProvider()),
        vscode.workspace.registerTextDocumentContentProvider(WHOCAN_SCHEME, new WhoCanDocumentProvider())
    ];

    context.subscriptions.push(...subscriptions);
}

async function showAccess(target?: any) {
    const namespace = targetNamespace(target);
    const uri = namespace ? accessDocumentProvider.namespaceUri(namespace) : accessDocumentProvider.clusterUri();
    await vscode.commands.executeCommand("markdown.showPreview", uri);
}

function targetNamespace(commandTarget: any): string | undefined {
    if (!commandTarget) {
        return undefined;
    }
    if (!clusterExplorer) {
        return undefined;
    }

    const node = clusterExplorer.resolveCommandTarget(commandTarget);
    if (node) {
        if (node.nodeType === 'resource' && node.resourceKind.manifestKind === 'Namespace') {
            // Technically we don't need to check the resource kind as we never display
            // the menu item for any other kind of resource. But this shows an example of
            // how to do it!
            return node.name;
        }
    }

    return undefined;
}

const WHOCAN_VERBS = [
    'get',
    'list',
    'watch',
    'create',
    'update',
    'patch',
    'delete'
];

async function whoCan(target?: any): Promise<void> {
    const targetNode = resolveWhoCanTarget(target);
    if (!targetNode) {
        // TODO: prompt
        vscode.window.showWarningMessage("Who Can does not yet implement prompting for target");
        return;
    }

    const verb = await vscode.window.showQuickPick(WHOCAN_VERBS, { placeHolder: 'Action to check who can do, e.g. get' });
    if (!verb) {
        return;
    }

    const resource = resourceID(targetNode);
    const uri = whoCanDocumentProvider.uri(verb, resource);
    await vscode.commands.executeCommand("markdown.showPreview", uri);
}

function resolveWhoCanTarget(target?: any): k8s.ClusterExplorerV1.ClusterExplorerResourceFolderNode | k8s.ClusterExplorerV1.ClusterExplorerResourceNode | undefined {
    if (!clusterExplorer) {
        return undefined;
    }

    const node = clusterExplorer.resolveCommandTarget(target);
    if (node && (node.nodeType === 'folder.resource' || node.nodeType === 'resource')) {
        return node;
    }
    return undefined;
}

function resourceID(node: k8s.ClusterExplorerV1.ClusterExplorerResourceFolderNode | k8s.ClusterExplorerV1.ClusterExplorerResourceNode): string {
    if (node.nodeType === 'folder.resource') {
        return node.resourceKind.abbreviation;
    }
    return `${node.resourceKind.abbreviation}/${node.name}`;
}
