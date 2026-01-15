export type FieldType =
    "input" | "checkbox" | "radio" | "textarea" | "button" | "select";

export interface SelectOption {
    label: string;
    value: string;
}

export interface FormField {
    // name: string;
    selector: string;
    type: FieldType;
    value?: string | boolean;
    options?: SelectOption[];
}

export interface ParsedForm {
    fields: FormField[];
    continueButton?: FormField;
}




export interface Jobs{
    title: string;
    jobUrl: string;
    element: HTMLLIElement;

}