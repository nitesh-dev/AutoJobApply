import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { sendMessage } from "@/services/extensionApi";

export class GPTExecutor extends BaseExecutor {

    // Selectors from gpt.ts
    private readonly selectorInputArea = "#prompt-textarea";
    private readonly selectorSubmitButton = "button[data-testid='send-button'], #composer-submit-button";
    private readonly selectorStopButton = "button[data-testid='stop-button']";

    // We want the last assistant response. attempting to get code block first as it's cleaner for JSON.
    private readonly selectorLastAssistantCodeBlock = "article[data-turn='assistant']:last-of-type pre:last-of-type";
    private readonly selectorLastAssistantText = "article[data-turn='assistant']:last-of-type [data-message-author-role='assistant']";
    private executionQueue: Promise<void> = Promise.resolve();

    onBegin(url: string, options?: { isManual?: boolean }) {
        this.logger.info("GPT Executor initialized...");
        this.logger.info("GPT Executor initialized... GPT Executor initialized... GPT Executor initialized...GPT Executor initialized... GPT Executor initialized... GPT Executor initialized... GPT Executor initialized... GPT Executor initialized...");


        // Let background know we are ready
        setTimeout(() => {
            sendMessage('GPT_READY', undefined);
        }, 1000);
    }

    async handleMessage(msg: ExtensionMessage) {
        if (msg.type === 'PROMPT_GPT') {
            const payload = msg.payload as { prompt: string };
            this.logger.info("Adding GPT Prompt request to queue...");

            // Chain the prompt execution to the existing queue
            const responsePromise = this.executionQueue.then(async () => {
                this.logger.info("Starting queued GPT Prompt execution...");
                return await this.executePrompt(payload.prompt);
            });

            // Update the queue to wait for this specific execution to finish (resolve or reject)
            this.executionQueue = responsePromise.then(() => { }).catch(() => { });

            // Return the result of this specific execution to the caller
            const result = await responsePromise;
            this.logger.info("Queued GPT Prompt execution finished.");
            return result;
        }
    }

    async executePrompt(prompt: string): Promise<string | null> {
        this.logger.processing("Executing GPT Prompt...");
        try {
            if (!this.setPrompt(prompt)) {
                throw new Error("Failed to set prompt");
            }

            // Small delay before clicking
            await new Promise(r => setTimeout(r, 500));

            if (!(await this.submit())) {
                throw new Error("Failed to submit prompt");
            }

            // Wait for generation to finish
            await this.waitForAIFinish();

            // Try to get valid JSON response with retries
            let response: string | null = null;
            for (let i = 0; i < 3; i++) {
                response = await this.getLastResponse();
                if (response) {
                    try {
                        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                        JSON.parse(cleanJson);
                        this.logger.success("Valid JSON response received");
                        break;
                    } catch (e) {
                        this.logger.warning(`Attempt ${i + 1}: Received invalid JSON or response not ready. Retrying...`);
                    }
                } else {
                    this.logger.warning(`Attempt ${i + 1}: No response found yet. Retrying...`);
                }

                if (i < 2) await new Promise(r => setTimeout(r, 2000));
            }

            this.logger.info("GPT Response extraction complete", { response });

            return response || '';

        } catch (e: any) {
            this.logger.error("GPT Execution failed", e);
            return null;
        }
    }

    private getInputArea(): HTMLElement | null {
        return document.querySelector(this.selectorInputArea);
    }

    private getSubmitButton(): HTMLButtonElement | null {
        return document.querySelector(this.selectorSubmitButton) as HTMLButtonElement | null;
    }

    private setPrompt(text: string): boolean {
        const input = this.getInputArea();
        if (!input) return false;

        // ChatGPT uses a contenteditable div or similar, textContent works better than value
        input.innerHTML = `<p>${text}</p>`;
        // Trigger input event
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
    }

    private async submit(): Promise<boolean> {
        const button = this.getSubmitButton();
        if (!button || button.disabled) return false;
        button.click();
        return true;
    }

    private async waitForAIFinish(timeoutMs: number = 60000): Promise<boolean> {
        this.logger.info("Waiting for GPT to generate...");
        const startTime = Date.now();
        const intervalMs = 1500; // Slightly slower polls to be easier on the CPU

        // Initial delay to let the 'stop' button appear and UI to stabilize
        await new Promise(r => setTimeout(r, 3000));

        while (Date.now() - startTime < timeoutMs) {
            // Regeneration/Send button logic: 
            // In modern ChatGPT, the send/submit button is usually disabled or replaced while generating
            const submitButton = document.querySelector(this.selectorSubmitButton) as HTMLButtonElement | null;
            const stopButton = document.querySelector(this.selectorStopButton);

            // If there is no stop button AND the submit button is present and NOT disabled, generation has finished
            // We also check for 'aria-disabled' as some React apps use it instead of the physical 'disabled' attribute
            const isSubmitEnabled = submitButton && 
                                   !submitButton.disabled && 
                                   submitButton.getAttribute('aria-disabled') !== 'true';

            if (!stopButton && isSubmitEnabled) {
                this.logger.success("GPT generation finished (buttons stabilized)");
                return true;
            }

            // Fallback: If we see the JSON structure already closing in the last message, we might be done
            const response = await this.getLastResponse();
            if (response && response.trim().endsWith('}')) {
                try {
                    JSON.parse(response);
                    this.logger.success("GPT generation finished (valid JSON detected)");
                    return true;
                } catch(e) {}
            }

            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        this.logger.warning("Timeout waiting for GPT generation");
        return false;
    }

    private async getLastResponse(): Promise<string | null> {
        // 1. Target the last assistant article's code blocks
        const lastPre = document.querySelector(this.selectorLastAssistantCodeBlock);
        
        let extractedText = "";

        if (lastPre) {
            // Target the specific CodeMirror content or standard code tag
            // We avoid innerText on the 'pre' itself because it includes UI labels like "JSON" and "Copy"
            const contentContainer = lastPre.querySelector(".cm-content, .cm-scroller, code");
            if (contentContainer) {
                this.logger.info("Found code content container, extracting...");
                extractedText = (contentContainer as HTMLElement).innerText || contentContainer.textContent || "";
            } else {
                // Last resort fallback for structure changes
                extractedText = (lastPre as HTMLElement).innerText;
            }
        } else {
            // 2. Fallback to extracting from the full message body
            const messageBody = document.querySelector(this.selectorLastAssistantText);
            if (messageBody) {
                this.logger.info("No code block found, checking message body...");
                extractedText = (messageBody as HTMLElement).innerText;
            }
        }

        if (!extractedText) return null;

        // 3. Clean and surgical JSON extraction
        // Remove zero-width spaces and other invisible characters CodeMirror often adds
        const cleaned = extractedText.replace(/\u200b/g, '').trim();
        
        // Find the actual JSON boundaries to ignore leading "JSON" headers or trailing noise
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && end > start) {
            const jsonPart = cleaned.substring(start, end + 1);
            this.logger.info("Surgically extracted JSON candidate", { 
                preview: jsonPart.substring(0, 50) + "..." 
            });
            return jsonPart;
        }

        return cleaned;
    }
}

