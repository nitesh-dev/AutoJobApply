import { FormField } from "./types";

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
        if (!el) return false;

        if (field.type === "input" || field.type === "textarea") {
            (el as HTMLInputElement).value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
        }

        if (field.type === "checkbox" || field.type === "radio") {
            (el as HTMLInputElement).checked = Boolean(value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
        }

        return false;
    }

    /** Autofill combobox/select-like input */
    async fillSelect(field: FormField, value: string) {
        const el = this.getElement(field.selector);
        if (!el) return false;

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
            return true;
        }

        return false;
    }

    // /** Click button using selector */
    // clickButton(field: FormField) {
    //     const el = this.getElement(field.selector);
    //     console.log("Clicking button:", field.selector, el);
    //     if (!el) return false;

    //     (el as HTMLElement).click();
    //     return true;
    // }

    /** High-level autofill for entire form */
    async autofill(fields: FormField[], data: Record<string, any>) {
        for (const field of fields) {
            const v = data[field.name || ""];

            if (v === undefined) continue;

            if (field.type === "select") {
                await this.fillSelect(field, v);
                continue;
            }

            if (field.type === "button") continue;

            this.fillField(field, v);
            await this.wait(100);
        }
    }

    // clickContinue(fields: FormField) {
    //     // const btn = fields.reverse().find((f) => f.type === "button");
    //     // if (btn) this.clickButton(btn);
    //     this.clickButton(fields);
    // }
}
