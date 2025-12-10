// utils/safeHandler.ts
export function safeHandler<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>
) {
    return async (...args: TArgs): Promise<{ success: boolean; data?: TResult; error?: string }> => {
        try {
            const data = await fn(...args);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    };
}
