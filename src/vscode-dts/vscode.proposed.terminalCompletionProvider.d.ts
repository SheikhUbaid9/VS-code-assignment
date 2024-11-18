/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {

	// https://github.com/microsoft/vscode/issues/226562

	export interface TerminalCompletionProvider<T extends TerminalCompletionItem[]> {
		id: string;
		/**
		 * Provide completions for the given position and document.
		 * @param terminal The terminal for which completions are being provided.
		 * @param context Information about the terminal's current state.
		 * @param token A cancellation token.
		 * @return A list of completions.
		 */
		// TODO: return TerminalCompletionItem | TermimalDirectoryFilesCompletionItem
		provideTerminalCompletions(terminal: Terminal, context: TerminalCompletionContext, token: CancellationToken): ProviderResult<T | Thenable<T | undefined>>;
	}

	// export class TerminalDirectoryFilesCompletionItem {
	// 	constructor(dir: string, includeFiles: boolean) {
	// 	}

	// `cd ` (should find src/, but not package.json)
	// `get-content ` (should find all files and directories, since since the file could be in an inner dir)
	// `cd src/ (should find folders within <cwd>/src)
	// }


	export interface TerminalCompletionItem {
		/**
		 * The completion's label which appears on the left beside the icon.
		 */
		label: string;
		/**
		 * The completion's icon to show on the left of the suggest widget.
		 */
		icon?: ThemeIcon;
		/**
		 * The completion's detail which appears on the right of the list.
		 */
		detail?: string;
		/**
		 * Whether the completion is a file. Files with the same score will be sorted against each other
		 * first by extension length and then certain extensions will get a boost based on the OS.
		 */
		isFile?: boolean;
		/**
		 * Whether the completion is a directory.
		 */
		isDirectory?: boolean;
		/**
		 * Whether the completion is a keyword.
		 */
		isKeyword?: boolean;

		/**
		 * The index of the start of the range to replace.
		 */
		replacementIndex: number;

		/**
		 * The length of the range to replace.
		 */
		replacementLength: number;
	}


	export interface TerminalCompletionContext {
		commandLine: string;
		cursorPosition: number;
	}

	export namespace window {
		/**
		 * Register a completion provider for a certain type of terminal.
		 *
		 * @param provider The completion provider.
		 * @returns A {@link Disposable} that unregisters this provider when being disposed.
		 */
		export function registerTerminalCompletionProvider<T extends TerminalCompletionItem[]>(provider: TerminalCompletionProvider<T>, ...triggerCharacters: string[]): Disposable;
	}
}
