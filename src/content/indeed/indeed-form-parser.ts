import { getUUID, delay } from "../utils";
import { FieldType, FormField, ParsedForm } from "./types";



export class IndeedDynamicFormParser {
  private root: HTMLElement;

  constructor(rootSelector: string = "#ia-container") {
    const el = document.querySelector(rootSelector);
    if (!el) throw new Error("Form root not found");
    this.root = el as HTMLElement;
  }

  /** Build stable selector for replaying autofill */
  /** Build stable selector for replaying autofill */
  private buildSelector(el: HTMLElement): string | null {
    const tag = el.tagName.toLowerCase();
    const id = el.getAttribute("id");
    const name = el.getAttribute("name");
    const aria = el.getAttribute("aria-label");

    // Helper to escape special CSS characters
    const escapeCss = (s: string) => s.replace(/([:.#])/g, "\\$1");

    if (id) return `${tag}#${escapeCss(id)}`;
    if (name) return `${tag}[name="${name}"]`;
    if (aria) return `${tag}[aria-label="${aria}"]`;

    if (tag === "button") {
      // Skip invisible buttons
      if (!this.isVisible(el)) return null;

      const testid = el.getAttribute("data-testid");
      if (testid) return `button[data-testid="${testid}"]`;

      const text = el.textContent?.trim().toLowerCase();
      const keywords = [
        "continue",
        "apply anyway",
        "continue applying",
        "submit your application",
        "submit application",
        "next",
        "apply",
      ];

      if (text && keywords.some(k => text.includes(k))) {
        return `TEXT=${text}`;
      }

      // Fallback: use class
      const cls = el.getAttribute("class");
      if (cls) {
        const classSelector = cls
          .split(" ")
          .map(c => `.${escapeCss(c)}`)
          .join("");
        return `button${classSelector}`;
      }

      return "button";
    }

    return null;
  }

  private isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);

    if (style.display === "none") return false;
    if (style.visibility === "hidden") return false;
    if (style.opacity === "0") return false;

    // const rect = el.getBoundingClientRect();
    // if (rect.width === 0 || rect.height === 0) return false;

    // // Cannot be outside viewport completely
    // if (rect.bottom < 0 || rect.top > window.innerHeight) return false;

    return true;
  }


  private detectType(el: HTMLElement): FieldType {
    const tag = el.tagName.toLowerCase();

    if (tag === "textarea") return "textarea";
    if (tag === "button") return "button";
    if (tag === "select") return "select";

    if (tag === "input") {
      const t = (el as HTMLInputElement).type;
      if (t === "checkbox") return "checkbox";
      if (t === "radio") return "radio";

      return "input";
    }

    // Detect combobox → treat as select-like
    if (el.getAttribute("role") === "combobox") return "select";

    return "input";
  }

  /** Extract actual value */
  private extractValue(el: HTMLElement, type: FieldType) {
    if (type === "checkbox" || type === "radio")
      return (el as HTMLInputElement).checked;

    if (type === "button") return undefined;

    if (type === "select")
      return (el as HTMLSelectElement).value || "";

    return (el as HTMLInputElement).value || "";
  }


  private extractLabel(el: HTMLElement): string | undefined {
    const id = el.getAttribute("id");
    const type = this.detectType(el);

    // For radio/checkbox, we need the group question + the specific option label
    if (type === "radio" || type === "checkbox") {
      let questionText = "";
      
      // 1. Try to find a grouping container label (Indeed specific structure)
      const fieldset = el.closest("fieldset");
      if (fieldset) {
        const legend = fieldset.querySelector("legend");
        if (legend) questionText = legend.textContent?.trim() || "";
      }

      // 2. Try looking for the "question label" by common Indeed ID patterns
      if (!questionText && id) {
        // e.g. input id: "single-select-question-:r0:-0" -> label id: "single-select-question-label-single-select-question-:r0:"
        const baseId = id.split("-").slice(0, -1).join("-");
        const groupLabel = this.root.querySelector(`[id*="label-${baseId}"]`);
        if (groupLabel) {
          questionText = groupLabel.textContent?.trim() || "";
        }
      }

      // 3. Fallback: Check for aria-labelledby
      const labelledBy = el.getAttribute("aria-labelledby");
      if (!questionText && labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) questionText = labelEl.textContent?.trim() || "";
      }

      // Get the specific option label (the "Yes" or "No")
      let optionLabel = "";
      if (id) {
        const labelEl = this.root.querySelector(`label[for="${id}"]`);
        if (labelEl) optionLabel = labelEl.textContent?.trim() || "";
      }

      const finalLabel = questionText 
        ? `${questionText}${optionLabel ? ` (${optionLabel})` : ""}` 
        : optionLabel;

      return finalLabel.replace(/\s+/g, ' ').replace(/\s\*$/, '').trim() || undefined;
    }

    // Try associated label element for other inputs
    if (id) {
      const labelEl = this.root.querySelector(`label[for="${id}"]`);
      const placeholder = el.getAttribute("placeholder");
      if (labelEl && placeholder) {
        return `${labelEl.textContent?.trim()} - ${placeholder}`;
      }
      if (labelEl) return labelEl.textContent?.trim();
    }

    // // Try parent label
    // if (el.parentElement && el.parentElement.tagName.toLowerCase() === "label") {
    //   return el.parentElement.textContent?.trim();
    // }

    return undefined;
  }

  /** Parse and find the continue button */
  private parseContinueButton(): FormField | undefined {
    const buttons = this.root.querySelectorAll("button");

    console.log({buttons})

    for (const button of buttons) {
      const htmlEl = button as HTMLElement;

      // Skip invisible buttons
      if (!this.isVisible(htmlEl)) continue;

      // Check if this is a continue button
      const text = htmlEl.innerText.toLowerCase();
      const keywords = [
        "continue",
        "apply anyway",
        "continue applying",
        "submit your application",
        "submit application",
        "next",
        "apply",
        "review your application"
      ];

      if (!text || !keywords.some(k => text.includes(k))) continue;

      // Generate unique ID and apply to element if it doesn't have one
      const uuid = getUUID();
      const existingId = htmlEl.getAttribute("id");

      let finalSelector: string;
      if (!existingId) {
        htmlEl.setAttribute("id", uuid);
        finalSelector = `button#${uuid}`;
      } else {
        const selector = this.buildSelector(htmlEl);
        if (!selector) continue;
        finalSelector = selector;
      }

      return {
        // name: uuid,
        selector: finalSelector,
        type: "button",
        value: undefined,
      };
    }

    return undefined;
  }

  /** Extract options from a select element */
  private extractSelectOptions(el: HTMLElement): { label: string; value: string }[] {
    const options: { label: string; value: string }[] = [];

    if (el.tagName.toLowerCase() === "select") {
      const selectEl = el as HTMLSelectElement;
      for (const option of selectEl.options) {
        options.push({
          label: option.textContent?.trim() || option.value,
          value: option.value,
        });
      }
    }

    return options;
  }

  async parse(): Promise<ParsedForm> {
    let fields: FormField[] = [];
    let continueButton: FormField | undefined;
    let retries = 0;

    while (retries < 2) {
      const elements = this.root.querySelectorAll(
        "input:not([type='hidden']), textarea, select, [role='combobox']"
      );

      fields = [];
      for (const element of elements) {
        const htmlEl = element as HTMLElement;

        // Skip invisible elements
        if (!this.isVisible(htmlEl)) continue;

        // Generate unique ID and apply to element if it doesn't have one
        const uuid = getUUID();
        const existingId = htmlEl.getAttribute("id");

        let finalSelector: string;
        if (!existingId) {
          // Apply the UUID as the id attribute
          htmlEl.setAttribute("id", uuid);
          finalSelector = `${htmlEl.tagName.toLowerCase()}#${uuid}`;
        } else {
          // Use existing selector logic
          const selector = this.buildSelector(htmlEl);
          if (!selector) continue;
          finalSelector = selector;
        }

        const type = this.detectType(htmlEl);
        const value = this.extractValue(htmlEl, type);
        const label = this.extractLabel(htmlEl);

        const field: FormField = {
          label,
          selector: finalSelector,
          type,
          value,
        };

        // Add options for select elements
        if (type === "select" || htmlEl.tagName.toLowerCase() === "select") {
          field.options = this.extractSelectOptions(htmlEl);
        }

        fields.push(field);
      }

      // Parse continue button
      continueButton = this.parseContinueButton();

      // If we found both fields and a continue button, we are likely done
      if (fields.length > 0 && continueButton) {
        break;
      }

      // If we found nothing, or if we have fields but are missing the button, retry
      // (Some pages legitimately have no fields, so we'll be more lenient if a button is found)
      if (fields.length === 0 && !continueButton) {
        console.log(`No fields or continue button found, retrying... (${retries + 1}/3)`);
      } else if (fields.length > 0 && !continueButton) {
        console.log(`Fields found but no continue button, retrying... (${retries + 1}/3)`);
      } else if (fields.length === 0 && continueButton) {
        // On transition pages, fields might be empty. We still retry once just in case.
        if (retries >= 1) break; 
        console.log(`Continue button found but no fields, retrying once more... (${retries + 1}/3)`);
      }

      await delay(2000);
      retries++;
    }

    return {
      fields,
      continueButton,
    };
  }
}
