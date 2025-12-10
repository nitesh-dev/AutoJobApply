import { FormField } from "./types";
import { logger } from "../logger";

export class IndeedAutoFiller {
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
            logger.warning(`Element not found for field: ${field.name}`);
            return false;
        }

        if (field.type === "input" || field.type === "textarea") {
            (el as HTMLInputElement).value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            logger.success(`Filled ${field.type}: ${field.name} = "${value}"`);
            return true;
        }

        if (field.type === "checkbox" || field.type === "radio") {
            (el as HTMLInputElement).checked = Boolean(value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            logger.success(`Set ${field.type}: ${field.name} = ${value}`);
            return true;
        }

        return false;
    }

    /** Autofill combobox/select-like input */
    async fillSelect(field: FormField, value: string) {
        const el = this.getElement(field.selector);
        if (!el) {
            logger.warning(`Select element not found for field: ${field.name}`);
            return false;
        }

        logger.processing(`Filling select: ${field.name} with "${value}"`);

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
            logger.success(`Selected option for ${field.name}: "${value}"`);
            return true;
        }

        logger.warning(`No matching option found for ${field.name}: "${value}"`);
        return false;
    }

    /** High-level autofill for entire form */
    async autofill(fields: FormField[], data: Record<string, any>) {
        logger.processing("Starting form autofill", { totalFields: fields.length });
        
        let filledCount = 0;
        for (const field of fields) {
            const v = data[field.name || ""];

            if (v === undefined) {
                logger.debug(`Skipping field ${field.name}: no data provided`);
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
        
        logger.success(`Autofill completed: ${filledCount}/${fields.length} fields filled`);
    }
}
