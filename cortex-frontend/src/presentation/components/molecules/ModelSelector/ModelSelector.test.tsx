import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Provider } from '@/features/chat/credentialsStore';

import { ModelSelector } from './ModelSelector';

const ALL_PROVIDERS: Provider[] = ['openai', 'anthropic', 'gemini', 'deepseek'];

describe('ModelSelector', () => {
    const mockOnSelect = vi.fn();

    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('should render a badge with the active model name and chevron', () => {
        render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={ALL_PROVIDERS}
                onSelect={mockOnSelect}
            />
        );

        const badge = screen.getByRole('button', { name: /GPT-4o/i });
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('aria-haspopup', 'menu');
        expect(within(badge).getByTestId('chevron-down')).toBeInTheDocument();
    });

    it('should disable the badge when no providers are validated', () => {
        render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={[]}
                onSelect={mockOnSelect}
            />
        );

        const badge = screen.getByRole('button', { name: /Sin modelo/i });
        expect(badge).toBeDisabled();
    });

    it('should open a popover listing validated-provider models when clicked', async () => {
        const user = userEvent.setup();

        render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={['openai', 'deepseek']}
                onSelect={mockOnSelect}
            />
        );

        const badge = screen.getByRole('button', { name: /GPT-4o/i });
        await user.click(badge);

        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();

        const options = screen.getAllByRole('menuitemradio');
        expect(options).toHaveLength(6); // 2 OpenAI + 4 DeepSeek
        expect(options[0]).toHaveTextContent('GPT-4o');
        expect(options[2]).toHaveTextContent('DeepSeek V4 Flash');
    });

    it('should only show models from validated providers', async () => {
        const user = userEvent.setup();

        render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={['openai']}
                onSelect={mockOnSelect}
            />
        );

        await user.click(screen.getByRole('button', { name: /GPT-4o/i }));

        const options = screen.getAllByRole('menuitemradio');
        expect(options).toHaveLength(2);
        expect(options[0]).toHaveTextContent('GPT-4o');
        expect(options[1]).toHaveTextContent('GPT-4o Mini');
        expect(screen.queryByText('Claude 3.5 Sonnet')).not.toBeInTheDocument();
    });

    it('should close the popover when clicking outside', async () => {
        const user = userEvent.setup();

        render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={ALL_PROVIDERS}
                onSelect={mockOnSelect}
            />
        );

        await user.click(screen.getByRole('button', { name: /GPT-4o/i }));
        expect(screen.getByRole('menu')).toBeInTheDocument();

        await user.click(document.body);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should close the popover on Escape and return focus to the badge', async () => {
        const user = userEvent.setup();

        render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={ALL_PROVIDERS}
                onSelect={mockOnSelect}
            />
        );

        const badge = screen.getByRole('button', { name: /GPT-4o/i });
        await user.click(badge);
        expect(screen.getByRole('menu')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(badge);
    });

    it('should select a model with keyboard arrow navigation and Enter', async () => {
        const user = userEvent.setup();

        render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={['openai']}
                onSelect={mockOnSelect}
            />
        );

        const badge = screen.getByRole('button', { name: /GPT-4o/i });
        await user.click(badge);

        const options = screen.getAllByRole('menuitemradio');
        expect(options).toHaveLength(2);

        await user.keyboard('{ArrowDown}{Enter}');

        expect(mockOnSelect).toHaveBeenCalledWith('gpt-4o-mini');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should call onSelect when a model option is clicked', async () => {
        const user = userEvent.setup();

        const { rerender } = render(
            <ModelSelector
                activeModel="gpt-4o"
                validatedProviders={['openai', 'deepseek']}
                onSelect={mockOnSelect}
            />
        );

        await user.click(screen.getByRole('button', { name: /GPT-4o/i }));

        const option = screen.getByRole('menuitemradio', { name: /DeepSeek V4 Flash/i });
        await user.click(option);

        expect(mockOnSelect).toHaveBeenCalledWith('deepseek-v4-flash');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        rerender(
            <ModelSelector
                activeModel="deepseek-v4-flash"
                validatedProviders={['openai', 'deepseek']}
                onSelect={mockOnSelect}
            />
        );

        expect(screen.getByRole('button', { name: /DeepSeek V4 Flash/i })).toBeInTheDocument();
    });
});
