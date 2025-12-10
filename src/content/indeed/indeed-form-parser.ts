import { getUUID } from "../utils";
import { FieldType, FormField, ParsedForm } from "./types";



export class IndeedDynamicFormParser {
  private root: HTMLElement;

  constructor(rootSelector: string = "#ia-container") {
    const el = document.querySelector(rootSelector);
    if (!el) throw new Error("Form root not found");
    this.root = el as HTMLElement;
  }

  /** Extract label by id, aria-label, wrapper <label>, or dom walk */
  private getLabel(el: HTMLElement): string | undefined {
    const id = el.getAttribute("id");
    if (id) {
      const l = this.root.querySelector(`label[for="${id}"]`);
      if (l) return l.textContent?.trim() || undefined;
    }

    const aria = el.getAttribute("aria-label");
    if (aria) return aria;

    const placeholder = el.getAttribute("placeholder");
    if (placeholder) return placeholder;

    const wrapperLabel = el.closest("label");
    if (wrapperLabel) return wrapperLabel.textContent?.trim() || undefined;

    const text = el.innerText.trim();
    if (text) return text;

    return undefined;
  }

  /** Build stable selector for replaying autofill */
  private buildSelector(el: HTMLElement): string | null {
    const tag = el.tagName.toLowerCase();
    const id = el.getAttribute("id");
    const name = el.getAttribute("name");
    const aria = el.getAttribute("aria-label");
    const text = el.innerText.toLowerCase();
    console.log(text)

    if (id) return `${tag}#${id}`;
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
        const classSelector = cls.split(" ").map(c => `.${c}`).join("");
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

  /** Parse and find the continue button */
  private parseContinueButton(): FormField | undefined {
    const buttons = this.root.querySelectorAll("button");
    
    for (const button of buttons) {
      const htmlEl = button as HTMLElement;

      console.log(htmlEl.innerText)
      
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
        id: uuid,
        label: this.getLabel(htmlEl),
        name: htmlEl.getAttribute("name") || undefined,
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

  public parse(): ParsedForm {
    const elements = this.root.querySelectorAll(
      "input:not([type='hidden']), textarea, select, [role='combobox']"
    );

    const fields: FormField[] = [];

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

      const field: FormField = {
        id: uuid,
        label: this.getLabel(htmlEl),
        name: htmlEl.getAttribute("name") || undefined,
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

    // Parse continue button separately
    const continueButton = this.parseContinueButton();

    return {
      fields,
      continueButton,
    };
  }
}
