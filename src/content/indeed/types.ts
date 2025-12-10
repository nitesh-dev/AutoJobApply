export type FieldType =
    "input" | "checkbox" | "radio" | "textarea" | "button" | "select";

export interface SelectOption {
    label: string;
    value: string;
}

export interface FormField {
    id: string;
    label?: string;
    name?: string;
    selector: string;
    type: FieldType;
    value?: string | boolean;
    options?: SelectOption[];
}

export interface ParsedForm {
    fields: FormField[];
    continueButton?: FormField;
}