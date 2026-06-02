import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardPage } from '@/presentation/pages/DashboardPage';

describe('DashboardPage', () => {
    it('renders the dashboard shell headline and description', () => {
        render(<DashboardPage />);

        expect(screen.getByRole('heading', { name: 'Dashboard shell ready for client modules' })).toBeInTheDocument();
        expect(screen.getByText(/first operational tables, forms/i)).toBeInTheDocument();
    });
});
