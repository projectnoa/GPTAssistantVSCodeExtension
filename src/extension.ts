/* eslint-disable @typescript-eslint/naming-convention */

import { Event, EventEmitter, ExtensionContext, ProgressLocation, TreeDataProvider, TreeItem, commands, window, workspace } from 'vscode';
import axios from 'axios';

const extensionName = 'juandy-gpt-assistant';

const optimizeCommand = `${extensionName}.optimize`;
const documentCommand = `${extensionName}.document`;
const analyzeCommand = `${extensionName}.analyze`;
const dryCommand = `${extensionName}.dry`;
const inquireCommand = `${extensionName}.inquire`;

const apiKeyKey = 'apiKey';
const optimizePromptKey = 'optimizePrompt';
const documentPromptKey = 'documentPrompt';
const analyzePromptKey = 'analyzePrompt';
const dryPromptKey = 'dryPrompt';

const chatAPIURL = 'https://api.openai.com/v1/chat/completions';
const editAPIURL = 'https://api.openai.com/v1/edits';

const chatModel = 'gpt-3.5-turbo';
const editModel = 'code-davinci-edit-001';

const apikeyMessage = 'Please provide your OpenAI API key in the extension settings.';
const missingAPIKeyMessage = 'Missing OpenAI API key. Please provide your OpenAI API key in the extension settings.';

const chatPrompt = 'You are a helpful coding assistant.';

const defaultError = 'An error occurred. Please try again later.';
const noTextSelected = 'No text selected.';
const noInput = 'No input provided.';

const languageKey = '{{LANG}}';

const optimizePrompt = `You are a code optimizer that receives ${languageKey} code and outputs an optimized version of the ${languageKey} code.`;
const documentPrompt = `You are a code documenting tool that receives ${languageKey} code and outputs the same code with comments in each line.`;
const analyzePrompt = `You are a code analyzer that receives ${languageKey} code and outputs an brief explanation of what the code does in plain English`;
const dryPrompt = `You are a code optimizer that receives ${languageKey} code and outputs refactored, concise, and DRY ${languageKey} code.`;
const inquirePrompt = 'Ask a question about this code.';

const onlyCodeDirective = ' Only reply with the output inside one unique code block, and nothing else. Do not write explanations.';

const resourseIcon = 'resources/icon.ico';

const panelViewId = 'prompt-panel-view';

/**
 * This method is called when the extension is activated.
 * It registers the commands and adds them to the context subscriptions.
 *
 * @param context Context of the extension
 */
export function activate(context: ExtensionContext) {
	
	const progressOptions = {
		location: ProgressLocation.Notification,
		title: 'Loading...',
		cancellable: true
	};

	// Register the optimize command and add it to the context subscriptions
	const optimizeDisposable = commands.registerCommand(optimizeCommand, async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(
					workspace
						.getConfiguration(extensionName)
						.get(optimizePromptKey, optimizePrompt) + onlyCodeDirective)
		  );
		}
	);

	context.subscriptions.push(optimizeDisposable);
	
	// Register the document command and add it to the context subscriptions
	const documentDisposable = commands.registerCommand(documentCommand,  async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(
					workspace
						.getConfiguration(extensionName)
						.get(documentPromptKey, documentPrompt) + onlyCodeDirective)
		  );
		}
	);

	context.subscriptions.push(documentDisposable);

	// Register the analyze command and add it to the context subscriptions
	const analizeDisposable = commands.registerCommand(analyzeCommand, async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(
					workspace
						.getConfiguration(extensionName)
						.get(analyzePromptKey, analyzePrompt), false)
		  );
		}
	);

	context.subscriptions.push(analizeDisposable);

	// Register the DRY command and add it to the context subscriptions
	const dryDisposable = commands.registerCommand(dryCommand, async () => {
		await window.withProgress(
			progressOptions,
			() =>
				executeCommand(
					workspace
						.getConfiguration(extensionName)
						.get(dryPromptKey, dryPrompt) + onlyCodeDirective)
		  );
		}
	);

	context.subscriptions.push(dryDisposable);

	// Register the inquire command and add it to the context subscriptions
	const inquireDisposable = commands.registerCommand(inquireCommand, async () => {
		await window.withProgress(
			progressOptions,
			async () => {
				// Get the active text editor
				const editor = window.activeTextEditor;

				// If there is no active text editor, exit the function
				if (!editor) {
					return;
				}

				// Get the user-selected text
				const selection = editor.selection;
				const selectedText = editor.document.getText(selection);

				// If there is no text selected, show an information message and exit the function
				if (!selectedText) {
					window.showInformationMessage(noTextSelected);

					return;
				}

				// Display an input box and request user input
				const userInput = await window.showInputBox({
					prompt: inquirePrompt
				});

				// Check if the user provided input or dismissed the input box
				if (userInput !== undefined) {
					// Handle the user input
					return executeCommand(userInput + selectedText, false);
				} else {
					// The user dismissed the input box without providing input
					window.showWarningMessage(noInput);
				}
			}
		  );
		}
	);

	context.subscriptions.push(inquireDisposable);

	// Register the panel view and add it to the context subscriptions
	const panelView = window.createTreeView(panelViewId, {
		treeDataProvider: new PanelViewDataProvider(context),
		showCollapseAll: true
	});
	
	context.subscriptions.push(panelView);
}

/**
 * This class is used to provide a structure to the panel view.
 */
class PanelViewDataProvider implements TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;
  
	constructor(private context: ExtensionContext) {}

	getTreeItem(element: TreeItem): TreeItem {
	  	return element;
	}
  
	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		const iconPath = {
			light: this.context.asAbsolutePath(resourseIcon),
			dark: this.context.asAbsolutePath(resourseIcon)
		};

		if (element === undefined) {
			const optimizeButton = new TreeItem('Optimize');
			optimizeButton.command = { command: optimizeCommand, title: 'Optimize', arguments: [] };
			optimizeButton.iconPath = iconPath;

			const documentButton = new TreeItem('Document');
			documentButton.command = { command: documentCommand, title: 'Document', arguments: [] };
			documentButton.iconPath = iconPath;

			const analyzeButton = new TreeItem('Analyze');
			analyzeButton.command = { command: analyzeCommand, title: 'Analyze', arguments: [] };
			analyzeButton.iconPath = iconPath;

			const dryButton = new TreeItem('DRY');
			dryButton.command = { command: dryCommand, title: 'DRY', arguments: [] };
			dryButton.iconPath = iconPath;

			const inquireButton = new TreeItem('Inquire');
			inquireButton.command = { command: inquireCommand, title: 'Inquire', arguments: [] };
			inquireButton.iconPath = iconPath;
			
			return Promise.resolve([optimizeButton, documentButton, analyzeButton, dryButton, inquireButton]);
		}
	
		return Promise.resolve([]);
	}
}

/**
 * This method executes the command selected by the user.
 * It retrieves the selected text from the active text editor, validates the input,
 * and calls generateCompletion() to perform the requested action.
 *
 * @param instruction Instructions to be followed by the model
 * @returns A promise that resolves when the edited code has been applied
 */
async function executeCommand(instruction: string, edit: boolean = true) {
	// Get the active text editor
	const editor = window.activeTextEditor;

	// If there is no active text editor, exit the function
	if (!editor) {
		return;
	}

	// Get the user-selected text
	const selection = editor.selection;
	const selectedText = editor.document.getText(selection);
	const languageId = editor.document.languageId;

	// If there is no text selected, show an information message and exit the function
	if (!selectedText) {
		window.showInformationMessage(noTextSelected);

		return;
	}

	// Call the generateEdit() or generateCompletion() functions to perform the requested action
	try {
		if (edit) {
			// Replace the {{CODE}} placeholder with the language ID
			const prompt = instruction.replace(languageKey, languageId);
			// Display an information popup
			//console.log(`PROMPT: \n${prompt}\n\n`);
			// Generate the edited code
			const response = await generateEdit(selectedText, prompt);
			// Display the response
			//console.log(`RESPONSE: \n\n${response}\n\n`);
			// Apply the edited code to the active text editor
			await editor.edit((editBuilder) => {
				editBuilder.replace(selection, response);
			});
		} else {
			// Generate the completion
			const response = await generateCompletion(`${instruction} \n\n${selectedText}`);
			// Display the response
			//console.log(`RESPONSE: \n\n${response}\n\n`);
			// Display an information popup
  			window.showInformationMessage(response);
		}
	} catch (error: any) {
		// Show an error message if there is an issue with generating the completion
		window.showErrorMessage('Error generating completion: ' + error.message);
	}
}

/**
 * Generates an edit completion for the provided prompt and instruction using the OpenAI API.
 *
 * @param prompt The input code to be processed
 * @param instruction The instruction to be followed by the model
 * @returns A Promise that resolves to the generated completion as a string
 * @throws An error if the API response is invalid or if the request fails
 */
async function generateEdit(prompt: string, instruction: string): Promise<string> {
	const apiKey = workspace.getConfiguration(extensionName).get(apiKeyKey);
	const apiURL = editAPIURL;

	// Check if the API key is provided
	if (!apiKey) {
		window.showErrorMessage(missingAPIKeyMessage);
		
		throw new Error(missingAPIKeyMessage);
	}

	const data = {
		model: editModel,
		input: prompt,
		instruction: instruction,
	};

	try {
		const response = await makeRequest(apiURL, data, apiKey);

		if (response.data.choices?.length > 0) {
			return response.data.choices[0].text.trim();
		} else {
			throw new Error(defaultError);
		}
	} catch (error: any) {
		throw error;
	}
}

/**
 * Generates an edit completion for the provided prompt and instruction using the OpenAI API.
 *
 * @param prompt The input code to be processed
 * @param instruction The instruction to be followed by the model
 * @returns A Promise that resolves to the generated completion as a string
 * @throws An error if the API response is invalid or if the request fails
 */
async function generateCompletion(prompt: string): Promise<string> {
	const apiKey = workspace.getConfiguration(extensionName).get(apiKeyKey);
	const apiURL = chatAPIURL;

	// Check if the API key is provided
	if (!apiKey) {
		window.showErrorMessage(missingAPIKeyMessage);

		throw new Error(missingAPIKeyMessage);
	}

	const data = {
		model: chatModel,
		messages: [
			{
				"role": "system",
				"content": chatPrompt
			},
			{
				"role": "user",
				"content": prompt
			}
		],
	};

	try {
		const response = await makeRequest(apiURL, data, apiKey);

		if (response.data.choices?.length > 0) {
			return response.data.choices[0].message.content.trim();
		} else {
			throw new Error(defaultError);
		}
	} catch (error: any) {
		throw error;
	}
}

async function makeRequest(url: string, data: any, apiKey: any, timeout: number = 30000): Promise<any> {
	try {
		const response = 
			await axios.post(url, data, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				timeout: timeout,
			});
		return response;
	} catch (error: any) {
		throw error;
	}
}

// This method is called when your extension is deactivated
export function deactivate() { /* NOTHING */ }
