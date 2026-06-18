import '@testing-library/jest-dom/vitest';

function dispatchCancel(dialog: HTMLDialogElement): boolean {
    const event = new Event('cancel', { bubbles: false, cancelable: true });
    dialog.dispatchEvent(event);
    return event.defaultPrevented;
}

const openModals: HTMLDialogElement[] = [];

if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
        openModals.push(this);
    };
}

if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.removeAttribute('open');
        const index = openModals.indexOf(this);
        if (index !== -1) {
            openModals.splice(index, 1);
        }
    };
}

document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || openModals.length === 0) {
        return;
    }

    const topmost = openModals[openModals.length - 1];
    const canceled = dispatchCancel(topmost);
    if (!canceled) {
        topmost.close();
    }
});
