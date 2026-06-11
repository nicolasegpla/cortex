import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownContent } from './MarkdownContent';

function renderMarkdown(content: string, role: 'user' | 'assistant' = 'assistant') {
    return render(<MarkdownContent content={content} role={role} />);
}

describe('MarkdownContent', () => {
    it('should render plain text', () => {
        renderMarkdown('Hello world');
        expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should render bold text', () => {
        renderMarkdown('This is **bold** text');
        const boldElement = screen.getByText('bold');
        expect(boldElement.tagName).toBe('STRONG');
        expect(boldElement).toHaveClass('markdown-content__strong');
    });

    it('should render italic text', () => {
        renderMarkdown('This is *italic* text');
        const emElement = screen.getByText('italic');
        expect(emElement.tagName).toBe('EM');
        expect(emElement).toHaveClass('markdown-content__em');
    });

    it('should render unordered lists', () => {
        renderMarkdown('- Item 1\n- Item 2\n- Item 3');
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render ordered lists', () => {
        renderMarkdown('1. First\n2. Second\n3. Third');
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should render inline code', () => {
        renderMarkdown('Use the `console.log()` function');
        const codeElement = screen.getByText('console.log()');
        expect(codeElement.tagName).toBe('CODE');
        expect(codeElement).toHaveClass('markdown-content__code-inline');
    });

    it('should render code blocks', () => {
        renderMarkdown('```typescript\nconst x = 1;\n```');
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('should render markdown tables', () => {
        const tableMarkdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;
        renderMarkdown(tableMarkdown);
        expect(screen.getByText('Header 1')).toBeInTheDocument();
        expect(screen.getByText('Header 2')).toBeInTheDocument();
        expect(screen.getByText('Cell 1')).toBeInTheDocument();
        expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });

    it('should render links', () => {
        renderMarkdown('[Click here](https://example.com)');
        const link = screen.getByText('Click here');
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', 'https://example.com');
        expect(link).toHaveAttribute('target', '_blank');
    });

    it('should render blockquotes', () => {
        renderMarkdown('> This is a quote');
        expect(screen.getByText('This is a quote')).toBeInTheDocument();
    });

    it('should render multiple paragraphs', () => {
        renderMarkdown('First paragraph.\n\nSecond paragraph.');
        expect(screen.getByText('First paragraph.')).toBeInTheDocument();
        expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    });

    it('should render non-breaking space for empty content', () => {
        const { container } = renderMarkdown('');
        const span = container.querySelector('span');
        expect(span).toBeInTheDocument();
        expect(span?.textContent).toBe('\u00A0');
    });

    it('should render non-breaking space for undefined/null content', () => {
        const { container } = renderMarkdown(undefined as unknown as string);
        const span = container.querySelector('span');
        expect(span).toBeInTheDocument();
        expect(span?.textContent).toBe('\u00A0');
    });

    it('should clean glued labels in assistant messages', () => {
        const glued = 'Cerveceria 2Nombre: Test BreweryCiudad: Bogotá';
        const { container } = renderMarkdown(glued, 'assistant');
        // After cleanup, labels should be on separate lines within the paragraph
        const paragraph = container.querySelector('.markdown-content__paragraph');
        expect(paragraph).toBeInTheDocument();
        expect(paragraph?.textContent).toContain('Cerveceria 2');
        expect(paragraph?.textContent).toContain('Nombre: Test Brewery');
        expect(paragraph?.textContent).toContain('Ciudad: Bogotá');
    });

    it('should not clean user messages', () => {
        const glued = 'Cerveceria 2Nombre: Test Brewery';
        renderMarkdown(glued, 'user');
        // User message should remain as-is (single paragraph)
        expect(screen.getByText('Cerveceria 2Nombre: Test Brewery')).toBeInTheDocument();
    });

    it('should default to assistant role', () => {
        const glued = 'DataNombre: Test';
        // No role prop provided — should default to assistant and clean
        const { container } = render(<MarkdownContent content={glued} />);
        expect(container.textContent).toContain('Data');
        expect(container.textContent).toContain('Nombre: Test');
    });
});
