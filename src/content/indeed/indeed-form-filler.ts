import { Logger } from "../logger";
import { FormField } from "./types";


export class IndeedAutoFiller {

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
            this.logger.warning(`Element not found for field: ${field.name}`);
            return false;
        }

        if (field.type === "input" || field.type === "textarea") {
            (el as HTMLInputElement).value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            this.logger.success(`Filled ${field.type}: ${field.name} = "${value}"`);
            return true;
        }

        if (field.type === "checkbox" || field.type === "radio") {
            (el as HTMLInputElement).checked = Boolean(value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            this.logger.success(`Set ${field.type}: ${field.name} = ${value}`);
            return true;
        }

        return false;
    }

    /** Autofill combobox/select-like input */
    async fillSelect(field: FormField, value: string) {
        const el = this.getElement(field.selector);
        if (!el) {
            this.logger.warning(`Select element not found for field: ${field.name}`);
            return false;
        }

        this.logger.processing(`Filling select: ${field.name} with "${value}"`);

        // Focus → type → wait for dropdown → select first matching option
        const input = el as HTMLInputElement;
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));

        await this.wait(300);

        // Find matching <li> from Indeed dropdown
        const options = Array.from(document.querySelectorAll("li[role='option']"));
        const match = options.find((li) =>
            li.textContent?.toLowerCase().includes(value.toLowerCase())
        );

        if (match) {
            (match as HTMLElement).click();
            this.logger.success(`Selected option for ${field.name}: "${value}"`);
            return true;
        }

        this.logger.warning(`No matching option found for ${field.name}: "${value}"`);
        return false;
    }

    /** High-level autofill for entire form */
    async autofill(fields: FormField[], data: Record<string, any>) {
        this.logger.processing("Starting form autofill", { totalFields: fields.length });
        
        let filledCount = 0;
        for (const field of fields) {
            const v = data[field.name || ""];

            if (v === undefined) {
                this.logger.debug(`Skipping field ${field.name}: no data provided`);
                continue;
            }

            if (field.type === "select") {
                const success = await this.fillSelect(field, v);
                if (success) filledCount++;
                continue;
            }

            if (field.type === "button") continue;

            const success = this.fillField(field, v);
            if (success) filledCount++;
            await this.wait(100);
        }
        
        this.logger.success(`Autofill completed: ${filledCount}/${fields.length} fields filled`);
    }
}
