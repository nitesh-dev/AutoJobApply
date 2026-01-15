export function getUUID() {
    return "id-" + self.crypto.randomUUID();
}



export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}