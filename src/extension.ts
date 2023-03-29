/* eslint-disable @typescript-eslint/naming-convention */

import { ExtensionContext, commands, window, workspace } from 'vscode';
import axios from 'axios';

/**
 * This method is called when the extension is activated.
 * It registers the commands and adds them to the context subscriptions.
 *
 * @param context Context of the extension
 */
export function activate(context: ExtensionContext) {
	console.log('Congratulations, your extension "juandyGPTcode" is now active!');
	
	// Register the optimize command and add it to the context subscriptions
	const optimizeDisposable = commands.registerCommand('juandyGPTcode.optimize', () =>
		executeCommand('Refactor, optimize, and document this code.')
	);

	context.subscriptions.push(optimizeDisposable);
	
	// Register the document command and add it to the context subscriptions
	const documentDisposable = commands.registerCommand('juandyGPTcode.document', () =>
		executeCommand('Document this code.')
	);

	context.subscriptions.push(documentDisposable);

	// Register the analyze command and add it to the context subscriptions
	const analizeDisposable = commands.registerCommand('juandyGPTcode.analyze', () =>
		executeCommand('Analyze this code.', false)
	);

	context.subscriptions.push(analizeDisposable);

	// Register the inquire command and add it to the context subscriptions
	const inquireDisposable = commands.registerCommand('juandyGPTcode.inquire', async () => {
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
			window.showInformationMessage('No text selected.');

			return;
		}

		// Display an input box and request user input
		const userInput = await window.showInputBox({
			prompt: 'Ask a question about this code.',
			value: selectedText
		});

		// Check if the user provided input or dismissed the input box
		if (userInput !== undefined) {
			// Handle the user input
			return executeCommand(userInput, false);
		} else {
			// The user dismissed the input box without providing input
			window.showWarningMessage('No input provided');
		}
	});

	context.subscriptions.push(inquireDisposable);
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

	// If there is no text selected, show an information message and exit the function
	if (!selectedText) {
		window.showInformationMessage('No text selected.');

		return;
	}

	// Call the generateEdit() or generateCompletion() functions to perform the requested action
	try {
		if (edit) {
			const response = await generateEdit(selectedText, instruction);

			// Apply the edited code to the active text editor
			await editor.edit((editBuilder) => {
				editBuilder.replace(selection, response);
			});
		} else {
			const response = await generateCompletion(`${instruction} \n\n${selectedText}`);

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
	const apiKey = workspace.getConfiguration('JuandyGPTExtension').get('apiKey', '');
	const apiURL = 'https://api.openai.com/v1/edits';

	// Check if the API key is provided
	if (!apiKey) {
		window.showErrorMessage('Please configure the API key in the settings.');
		
		throw new Error('API key not configured');
	}

	const data = {
		model: "code-davinci-edit-001",
		input: prompt,
		instruction: instruction,
	};

	try {
		const response = 
			await axios.post(apiURL, data, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
      			timeout: 30000, // Timeout in milliseconds (10 seconds)
			});

		if (response.data.choices?.length > 0) {
			return response.data.choices[0].text.trim();
		} else {
			throw new Error('No completion generated');
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
	const apiKey = workspace.getConfiguration('JuandyGPTExtension').get('apiKey', '');
	const apiURL = 'https://api.openai.com/v1/chat/completions';

	// Check if the API key is provided
	if (!apiKey) {
		window.showErrorMessage('Please configure the API key in the settings.');

		throw new Error('API key not configured');
	}

	const data = {
		model: "gpt-3.5-turbo",
		messages: [
			{
				"role": "system",
				"content": "You are a helpful coding assistant."
			},
			{
				"role": "user",
				"content": prompt
			}
		],
	};

	try {
		const response = 
			await axios.post(apiURL, data, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
      			timeout: 30000, // Timeout in milliseconds (10 seconds)
			});

		if (response.data.choices?.length > 0) {
			return response.data.choices[0].message.content.trim();
		} else {
			throw new Error('No completion generated');
		}
	} catch (error: any) {
		throw error;
	}
}

// This method is called when your extension is deactivated
export function deactivate() { /* NOTHING */ }
