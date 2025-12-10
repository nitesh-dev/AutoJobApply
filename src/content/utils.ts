export function getUUID() {
    return "id-" + self.crypto.randomUUID();
}