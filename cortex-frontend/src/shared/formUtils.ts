export function normalizeFormPayload<T extends Record<string, unknown>>(
    payload: T,
    lowercaseKeys: string[]
): T {
    const normalized = {} as T;

    for (const [key, value] of Object.entries(payload)) {
        if (lowercaseKeys.includes(key)) {
            if (typeof value === 'string') {
                normalized[key as keyof T] = value.toLowerCase() as T[keyof T];
            } else if (Array.isArray(value)) {
                normalized[key as keyof T] = value.map((item) =>
                    typeof item === 'string' ? item.toLowerCase() : item
                ) as T[keyof T];
            } else {
                normalized[key as keyof T] = value as T[keyof T];
            }
        } else {
            normalized[key as keyof T] = value as T[keyof T];
        }
    }

    return normalized;
}
