'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const subscriptions = [
        vscode.commands.registerCommand('k8saccessviewer.showAccess', showAccess)
    ];

    context.subscriptions.push(...subscriptions);
}

function showAccess() {
    // TBA
}
