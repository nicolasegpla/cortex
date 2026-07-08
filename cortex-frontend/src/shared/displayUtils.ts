export function formatDisplayValue(value: string | null | undefined): string {
    if (!value) return '-';
    return value.toLowerCase();
}
