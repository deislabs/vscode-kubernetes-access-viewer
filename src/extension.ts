'use strict';

import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

import * as rakkess from './rakkess/rakkess';
import { shell } from './utils/shell';
import { failed } from './utils/errorable';
import { Access } from './rakkess/rakkess.apimodel';
import { longRunning } from './utils/host';

let commandTargetResolver: k8s.CommandTargetsV1 | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {
    const commandTargets = await k8s.extension.commandTargets.v1;
    if (commandTargets.available) {
        commandTargetResolver = commandTargets.api;
    } else {
        vscode.window.showErrorMessage("Unable to access Kubernetes extension");  // TODO: better error message
    }

    const subscriptions = [
        vscode.commands.registerCommand('k8saccessviewer.showAccess', showAccess)
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

    showAccessView(access.result);
}

function showAccessView(access: Access): void {
    const json = JSON.stringify(access, undefined, 2);
    console.log(json);
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
