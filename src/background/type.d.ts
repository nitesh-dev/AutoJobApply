export type ChromeApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
}


export interface GetAllTabRes {
    id: number; 
    url: string | undefined
}