import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/presentation/components/atoms/Button/Button';

describe('Button', () => {
    it('renders the provided text content', () => {
        render(<Button>Save changes</Button>);

        expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });

    it('calls onClick when the user clicks the button', async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();

        render(<Button onClick={handleClick}>Submit</Button>);

        await user.click(screen.getByRole('button', { name: 'Submit' }));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
