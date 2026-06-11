import { describe, expect, it } from 'vitest';
import { cleanMarkdown } from './cleanMarkdown';

describe('cleanMarkdown', () => {
    describe('assistant messages', () => {
        it('should insert line breaks before glued Spanish labels', () => {
            const raw = 'Cerveceria 2Nombre: Test BreweryCiudad: BogotáPaís: Colombia';
            const expected = 'Cerveceria 2\nNombre: Test Brewery\nCiudad: Bogotá\nPaís: Colombia';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should insert line breaks before glued English labels', () => {
            const raw = 'DataBrewery: Test BrewCity: BogotáCountry: Colombia';
            const expected = 'Data\nBrewery: Test Brew\nCity: Bogotá\nCountry: Colombia';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should handle multiple glued labels in sequence', () => {
            const raw = 'Brew ANombre: Brew ACiudad: BogotáPaís: Colombia';
            const expected = 'Brew A\nNombre: Brew A\nCiudad: Bogotá\nPaís: Colombia';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should handle mixed Spanish and English labels', () => {
            const raw = 'InfoNombre: TestDirección: Calle 1Phone: 123-456';
            const expected = 'Info\nNombre: Test\nDirección: Calle 1\nPhone: 123-456';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should not touch already-clean text with proper line breaks', () => {
            const clean = 'Nombre: Test Brewery\nCiudad: Bogotá\nPaís: Colombia';
            expect(cleanMarkdown(clean, 'assistant')).toBe(clean);
        });

        it('should not touch prose without glued labels', () => {
            const prose = 'Here is some information about the brewery. It is located in Bogotá, Colombia.';
            expect(cleanMarkdown(prose, 'assistant')).toBe(prose);
        });

        it('should not separate labels that already have spaces before them', () => {
            const clean = 'The brewery name is Nombre: Test Brewery';
            expect(cleanMarkdown(clean, 'assistant')).toBe(clean);
        });

        it('should not touch URLs with colons', () => {
            const url = 'Visit https://example.com:8080/path for more info';
            expect(cleanMarkdown(url, 'assistant')).toBe(url);
        });

        it('should handle equipment-related labels', () => {
            const raw = 'BreweryEquipo: 500LMarca: Ss BrewtechCapacidad: 1000L';
            const expected = 'Brewery\nEquipo: 500L\nMarca: Ss Brewtech\nCapacidad: 1000L';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should handle contact labels', () => {
            const raw = 'InfoTeléfono: 311-555-1234Email: test@example.comContacto: Juan Pérez';
            const expected = 'Info\nTeléfono: 311-555-1234\nEmail: test@example.com\nContacto: Juan Pérez';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should handle beer-specific labels', () => {
            const raw = 'BreweryEstilos: IPA, StoutLúpulos: CascadeMalta: PilsnerLevadura: US-05';
            const expected = 'Brewery\nEstilos: IPA, Stout\nLúpulos: Cascade\nMalta: Pilsner\nLevadura: US-05';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should handle business labels', () => {
            const raw = 'BreweryObservaciones: Great placeOportunidades: ExpansionSales: OnlineDistribution: Nationwide';
            const expected = 'Brewery\nObservaciones: Great place\nOportunidades: Expansion\nSales: Online\nDistribution: Nationwide';
            expect(cleanMarkdown(raw, 'assistant')).toBe(expected);
        });

        it('should not produce false positives on common words', () => {
            const prose = 'The phone number is 3115551234. The styles are IPA and Stout.';
            expect(cleanMarkdown(prose, 'assistant')).toBe(prose);
        });

        it('should handle empty string', () => {
            expect(cleanMarkdown('', 'assistant')).toBe('');
        });

        it('should preserve already-formatted records with blank lines', () => {
            const formatted = '1. Nombre: Brew A\n   Ciudad: Bogotá\n\n2. Nombre: Brew B\n   Ciudad: Medellín';
            expect(cleanMarkdown(formatted, 'assistant')).toBe(formatted);
        });
    });

    describe('user messages', () => {
        it('should never modify user messages', () => {
            const raw = 'Cerveceria 2Nombre: Test BreweryCiudad: Bogotá';
            expect(cleanMarkdown(raw, 'user')).toBe(raw);
        });

        it('should leave user prose untouched', () => {
            const prose = 'Tell me about the brewery in Bogotá, Colombia.';
            expect(cleanMarkdown(prose, 'user')).toBe(prose);
        });

        it('should not touch user messages with labels', () => {
            const userInput = 'Nombre: Test, Ciudad: Bogotá';
            expect(cleanMarkdown(userInput, 'user')).toBe(userInput);
        });
    });

    describe('activation detection', () => {
        it('should not activate on prose containing label words with spaces', () => {
            const prose = 'The brewery name is Nombre de la cervecería and the city is Ciudad de Bogotá.';
            expect(cleanMarkdown(prose, 'assistant')).toBe(prose);
        });

        it('should activate only when labels are glued (no space before)', () => {
            const glued = 'DataNombre: Test';
            expect(cleanMarkdown(glued, 'assistant')).toBe('Data\nNombre: Test');
        });

        it('should not activate on labels at start of string', () => {
            const start = 'Nombre: Test Brewery';
            expect(cleanMarkdown(start, 'assistant')).toBe(start);
        });
    });
});
