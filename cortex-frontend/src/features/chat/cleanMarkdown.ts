/**
 * Conservative safety-net cleanup for assistant messages in the brewery domain.
 *
 * Only runs on assistant messages. Only activates when content looks like
 * glued detail fields (e.g., "Nombre: TestCiudad: Bogotá").
 *
 * Uses a known allowlist of brewery field labels, NOT a generic regex.
 * Inserts line breaks before known labels when they appear glued to
 * preceding text.
 *
 * Keeps already-good content untouched. Never modifies user messages.
 */

// Known brewery field labels in Spanish and English that commonly get glued
// to preceding text by LLMs. This is a domain-specific allowlist.
const KNOWN_LABELS = [
  'Nombre',
  'Ciudad',
  'País',
  'Pais',
  'Dirección',
  'Direccion',
  'Teléfono',
  'Telefono',
  'Email',
  'Contacto',
  'Equipo',
  'Cervecero',
  'Estilos',
  'Lúpulos',
  'Lupulos',
  'Malta',
  'Levadura',
  'Observaciones',
  'Oportunidades',
  'Marca',
  'Capacidad',
  'Calidad',
  'Formatos',
  'Canal',
  'Cervecería',
  'Cerveceria',
  'Brewery',
  'City',
  'Country',
  'Address',
  'Phone',
  'Equipment',
  'Brewer',
  'Styles',
  'Hops',
  'Yeast',
  'Production',
  'Sales',
  'Distribution',
];

// Build a regex that looks for a non-whitespace character immediately
// followed by a known label and a colon. We insert a newline before the label.
// The (?!\/\/) negative lookahead preserves URLs like https://...
const LABEL_PATTERN = new RegExp(
  `(\\S)(${KNOWN_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}):(?!//)`,
  'gi',
);

/**
 * Check if text looks like it has glued detail fields.
 *
 * We only activate cleanup when we detect the pattern of a label
 * immediately preceded by a non-whitespace character. This avoids
 * touching clean prose that happens to contain these words.
 */
function looksLikeGluedFields(text: string): boolean {
  return LABEL_PATTERN.test(text);
}

/**
 * Clean assistant message content by inserting line breaks before
 * known field labels that are glued to preceding text.
 *
 * @param text - The message content
 * @param role - The message role ('user' | 'assistant')
 * @returns Cleaned content if assistant with glued fields, otherwise unchanged
 */
export function cleanMarkdown(text: string, role: 'user' | 'assistant'): string {
  // Only run on assistant messages
  if (role !== 'assistant') {
    return text;
  }

  // Only activate when content looks like glued detail fields
  if (!looksLikeGluedFields(text)) {
    return text;
  }

  // Reset regex lastIndex since we used test() above
  LABEL_PATTERN.lastIndex = 0;

  // Insert line break before glued labels
  return text.replace(LABEL_PATTERN, '$1\n$2:');
}
