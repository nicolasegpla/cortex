export const parseArray = (value: string): string[] =>
    value.trim() ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];

export const joinArray = (arr: string[] | null | undefined): string =>
    arr?.length ? arr.join(', ') : '';
