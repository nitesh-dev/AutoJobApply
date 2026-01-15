import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { IndeedAutoFiller } from "./indeed-form-filler";
import { IndeedDynamicFormParser } from "./indeed-form-parser";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";

export class IndeedForm extends BaseExecutor {
    // Hardcoded for now as per previous implementation
    private url = "";


    constructor(private page: Page) {
        super();
    }

    init(url: string) {
        this.url = url
        this.logger.info("Form Filler initialized...");
        setTimeout(() => this.processForm(), 2000);
    }

    handleMessage(_message: ExtensionMessage) {
        // RPC handled
    }


    private excludeForm = ["resume-selection-module", "form/review-module"]

    async processForm() {
        try {
            this.logger.info("Processing Indeed application form...");
            await this.page.waitForNetworkIdle();
            await this.page.waitForSelector("#ia-container");

            const parser = new IndeedDynamicFormParser();
            const { fields, continueButton } = parser.parse();
            this.logger.success("Form parsed successfully", { fields, continueButton });

            // don't process gpt in url include excludeForm
            if (this.excludeForm.some((form) => this.url.includes(form))) {
                this.logger.info("Form is in exclude list. Skipping GPT processing.");
            } else {
                const prompt = `
                I am applying for a job. Here are the form fields I need to fill:
                ${JSON.stringify(fields, null, 2)}

                My details:
                Name: Jarvis
                Email: jarvis@example.com
                Phone: +91 9999999999
                City: Patna, Bihar
                Postal Code: 844114
                Address: Sector 5, AIIMS
                Current Company: Google DeepMind
                LinkedIn: linkedin.com/in/jarvis
                Portfolio: jarvis.dev

                Please generate a JSON object where keys match the selector of the fields and values are the answers.
                Return strictly JSON in code block.
                `;

                // Ask GPT for data
                const res = await api.proxyGpt(prompt);
                const answer = res as any;
                console.log("GPT Response:", { answer });

                if (answer) {
                    const data = JSON.parse(answer.replace(/```json/g, '').replace(/```/g, '').trim());
                    const auto = new IndeedAutoFiller();
                    await auto.autofill(fields, data);
                }
            }

            if (continueButton) {
                this.logger.info("Autofill done. Clicking continue/submit...");
                await this.page.click(continueButton.selector);

                // If it's the final review page or similar, we might want to report 'completed'
                // For now, let's just keep reporting progress.
            }

        } catch (error) {
            this.logger.error("Error processing form", error);
            await api.reportJobStatus('failed');
        }
    }

    onUrlChange(_url: string) {
        this.url = _url;
        this.processForm();
    }
}
