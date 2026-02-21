import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { IndeedAutoFiller } from "./indeed-form-filler";
import { IndeedDynamicFormParser } from "./indeed-form-parser";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { delay } from "../utils";

export class IndeedForm extends BaseExecutor {
    // Hardcoded for now as per previous implementation
    private url = "";
    private isProcessing = false;
    private options?: { noClick?: boolean };


    constructor(private page: Page) {
        super();
    }

    init(url: string, options?: { noClick?: boolean }) {
        this.url = url
        this.options = options;
        this.logger.info("Form Filler initialized...");
        setTimeout(() => this.processForm(), 2000);
    }

    handleMessage(_message: ExtensionMessage) {
        // RPC handled
    }


    private excludeForm = ["resume-selection-module", "form/review-module"]

    async processForm() {
        if (this.isProcessing) {
            this.logger.info("Form processing already in progress. Skipping duplicate call.");
            return;
        }

        this.isProcessing = true;
        try {

            let resume = await (await api.getConfig()).resumeText;
            this.logger.info("Processing Indeed application form...");
            await this.page.waitForNetworkIdle();
            await this.page.waitForSelector("#ia-container");

            if (this.url.includes("form/review-module")) {
                await this.page.waitForSelector('button[data-testid="submit-application-button"]', 10000)
            }

            if (this.url.includes("form/post-apply")) {
                // form submitted successfully
                this.logger.success("Application form submitted successfully!");
                await api.reportJobStatus('completed');
                return;
            }

            if (this.url.includes("resume-selection-module")) {
                this.logger.info("On resume selection module, checking for resume upload...");
                const config = await api.getConfig();
                if (config.resumeFile) {
                    this.logger.info("Resume file found in settings, attempting to upload...");
                    await this.handleResumeUpload(config.resumeFile);
                } else {
                    this.logger.info("No resume file in settings, proceeding with default...");
                }
                await delay(4000);
            }

            const parser = new IndeedDynamicFormParser();
            const { fields, continueButton } = await parser.parse();
            this.logger.success("Form parsed successfully", { fields, continueButton });

            // don't process gpt in url include excludeForm
            if (this.excludeForm.some((form) => this.url.includes(form))) {
                this.logger.info("Form is in exclude list. Skipping GPT processing.");
            } else if (!fields.length) {
                this.logger.info("No fields found to fill.");

            } else {
                const prompt = `
                I am applying for a job. Here are the form fields I need to fill:
                ${JSON.stringify(fields, null, 2)}

                My details:
                ${resume}

                Please generate a JSON object where keys match the selector of the fields and values are the answers.
                Return strictly JSON in code block.
                `;

                // Ask GPT for data
                const res = await api.proxyGpt(prompt);
                const answer = res as any;
                console.log("GPT Response:", { answer });

                if (answer) {
                    const data = JSON.parse(answer.replace(/```json/g, '').replace(/```/g, '').trim());
                    const auto = new IndeedAutoFiller(this.page);
                    await auto.autofill(fields, data);
                }
            }

            if (continueButton) {
                if (this.options?.noClick) {
                    this.logger.info("Autofill done. Manual mode: Skipping automatic click on continue/submit.");
                    return;
                }
                this.logger.info("Autofill done. Clicking continue/submit...");
                await this.page.click(continueButton.selector);

                if (this.url.includes("form/review-module")) {
                    this.logger.success("Application form submitted successfully!");
                    await api.reportJobStatus('completed');

                }


                // If it's the final review page or similar, we might want to report 'completed'
                // For now, let's just keep reporting progress.
            } else {
                this.logger.warning("No continue/submit button found.");
            }

        } catch (error: any) {
            this.logger.error("Error processing form", error);
            await api.reportJobStatus('failed', error.message || String(error));
        } finally {
            this.isProcessing = false;
        }
        // close(); // We shouldn't call close() here as the background script now handles tab closing, and it might be premature.
    }

    onUrlChange(_url: string) {
        this.url = _url;
        this.processForm();
    }

    private async handleResumeUpload(resumeFile: { name: string; data: string }) {
        try {
            // 1. Select the "Upload a resume" radio card
            const uploadRadioCard = document.querySelector('[data-testid="resume-selection-file-resume-upload-radio-card"]');
            if (uploadRadioCard) {
                (uploadRadioCard as HTMLElement).click();
                this.logger.info("Selected 'Upload a resume' option.");
                await delay(1000);
            }

            // 2. Find the file input
            const fileInput = document.querySelector('input[data-testid="resume-selection-file-resume-upload-radio-card-file-input"]') as HTMLInputElement;
            if (!fileInput) {
                this.logger.error("Could not find resume file input");
                return;
            }

            // 3. Convert Base64 dataURI to File object
            const response = await fetch(resumeFile.data);
            const blob = await response.blob();
            const file = new File([blob], resumeFile.name, { type: blob.type });

            // 4. Use DataTransfer to simulate file selection
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            // 5. Dispatch change event to trigger upload
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            this.logger.success(`Resume "${resumeFile.name}" selected for upload.`);
            await delay(3000); // Wait for upload to process
        } catch (error: any) {
            this.logger.error("Failed to upload resume", error);
        }
    }
}
