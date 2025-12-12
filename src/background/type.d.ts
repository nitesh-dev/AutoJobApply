export type ChromeApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
}
