import { Page } from "../automation/page";
import { Logger } from "../logger";
import { FormField } from "./types";


export class IndeedAutoFiller {

    constructor(private page: Page) {}



    private logger = new Logger();
    async wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /** Try selecting field via its selector */
    getElement(selector: string): HTMLElement | null {
        try {
            return document.querySelector(selector);
        } catch (_) {
            return null;
        }
    }

    /** Autofill text / checkbox / radio / textarea */
    fillField(field: FormField, value: any) {
        const el = this.getElement(field.selector);
        if (!el) {
            this.logger.warning(`Element not found for field: ${field.selector}`);
            return false;
        }

        if (field.type === "input" || field.type === "textarea") {
            (el as HTMLInputElement).value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            this.logger.success(`Filled ${field.type}: ${field.selector} = "${value}"`);
            return true;
        }

        if (field.type === "checkbox") {

            // update checkbox state based on value
            const checkbox = el as HTMLInputElement;
            const shouldBeChecked = Boolean(value);
            if (checkbox.checked !== shouldBeChecked) {
                this.page.click(field.selector);
                this.logger.success(`Set checkbox: ${field.selector} to ${shouldBeChecked}`);
            }else{
                this.logger.debug(`Checkbox: ${field.selector} already set to ${shouldBeChecked}`);
            }

            return true;
        }

        if( field.type === "radio"){
            if(Boolean(value)){
                this.page.click(field.selector);
                this.logger.success(`Selected ${field.type}: ${field.selector}`);
                return true;
            }
        }

        return false;
    }

    /** Autofill combobox/select-like input */
    async fillSelect(field: FormField, value: string) {
        const el = this.getElement(field.selector);
        if (!el) {
            this.logger.warning(`Select element not found for field: ${field.selector}`);
            return false;
        }

        this.logger.processing(`Filling select: ${field.selector} with "${value}"`);

        // Focus → type → wait for dropdown → select first matching option
        const input = el as HTMLInputElement;
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        

        await this.wait(1000);

        // Find matching <li> from Indeed dropdown
        const options = Array.from(document.querySelectorAll("li[role='option']"));
        const match = options.find((li) =>
            li.textContent?.toLowerCase().includes(value.toLowerCase())
        );

        if (match) {
            (match as HTMLElement).click();
            this.logger.success(`Selected option for ${field.selector}: "${value}"`);
            return true;
        }

        this.logger.warning(`No matching option found for ${field.selector}: "${value}"`);
        return false;
    }

    /** High-level autofill for entire form */
    async autofill(fields: FormField[], data: Record<string, any>) {
        this.logger.processing("Starting form autofill", { totalFields: fields.length });
        console.log({data})
        let filledCount = 0;
        for (const field of fields) {
            const v = data[field.selector || ""];
            

            if (v === undefined) {
                this.logger.debug(`Skipping field ${field.selector}: no data provided`);
                continue;
            }

            if (field.type === "select") {
                const success = await this.fillSelect(field, v);
                if (success) filledCount++;
                await this.wait(200);
                continue;
            }

            if (field.type === "button") continue;

            const success = this.fillField(field, v);
            if (success) filledCount++;
            await this.wait(200);
        }
        
        this.logger.success(`Autofill completed: ${filledCount}/${fields.length} fields filled`);
    }
}
