export function getTopmostModal(): Element | null {
    const modals = document.querySelectorAll('[aria-modal="true"], dialog[open]');
    return modals.length > 0 ? modals[modals.length - 1] : null;
}

export function hasNestedModal(container: Element): boolean {
    return container.querySelectorAll('[aria-modal="true"], dialog[open]').length > 1;
}
