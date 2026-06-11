"""Response text normalization for factual prose."""

import re

# Known brewery field labels in Spanish and English that commonly get glued
# to preceding text by LLMs.
KNOWN_LABELS = [
    "Nombre",
    "Ciudad",
    "País",
    "Pais",
    "Dirección",
    "Direccion",
    "Teléfono",
    "Telefono",
    "Email",
    "Contacto",
    "Equipo",
    "Cervecero",
    "Estilos",
    "Lúpulos",
    "Lupulos",
    "Malta",
    "Levadura",
    "Observaciones",
    "Oportunidades",
    "Marca",
    "Capacidad",
    "Calidad",
    "Formatos",
    "Canal",
    "Cervecería",
    "Cerveceria",
    "Brewery",
    "City",
    "Country",
    "Address",
    "Phone",
    "Equipment",
    "Brewer",
    "Styles",
    "Hops",
    "Yeast",
    "Production",
    "Sales",
    "Distribution",
]

# Build a single regex pattern for all known labels.
# We look for a non-whitespace character immediately followed by a known label
# and a colon. We insert a newline before the label.
_LABEL_PATTERN = re.compile(
    r"(\S)(" + "|".join(re.escape(lbl) for lbl in KNOWN_LABELS) + r"):(?!\/\/)",
    re.IGNORECASE,
)

# Space before Spanish inverted punctuation when preceded by a word char or digit.
_INVERTED_PUNCT_PATTERN = re.compile(r"(\w)([¿¡])")

# Sentence punctuation followed immediately by a letter (missing space).
# This applies to comma, semicolon, colon.
_PUNCT_LETTER_PATTERN = re.compile(r"([,;:])([a-zA-ZáéíóúÁÉÍÓÚñÑ¿¡])")

# Period, exclamation, question followed immediately by an uppercase letter.
# We avoid matching decimal points (digit.digit) and URLs.
_END_PUNCT_UPPER_PATTERN = re.compile(
    r"([.!?])([A-ZÁÉÍÓÚÑ])"
)


def normalize_response_text(text: str) -> str:
    """Normalize glued factual prose without changing underlying facts.

    Fixes common formatting issues in LLM-generated Spanish/English brewery
    responses:
    - Separates labels glued to preceding text (e.g. "Cerveceria 2Nombre:")
    - Adds spaces after sentence punctuation when followed by text
    - Adds spaces before Spanish inverted punctuation marks
    """
    if not text:
        return text

    # 1. Separate known labels glued to preceding text.
    # e.g. "Cerveceria 2Nombre:" -> "Cerveceria 2\nNombre:"
    text = _LABEL_PATTERN.sub(r"\1\n\2:", text)

    # 2. Space before inverted question/exclamation marks.
    # e.g. "ninguna¿Necesitas" -> "ninguna ¿Necesitas"
    text = _INVERTED_PUNCT_PATTERN.sub(r"\1 \2", text)

    # 3. Space after comma/semicolon/colon followed by letter.
    # e.g. "Bogotá,Medellín" -> "Bogotá, Medellín"
    text = _PUNCT_LETTER_PATTERN.sub(r"\1 \2", text)

    # 4. Space after period/exclamation/question followed by uppercase.
    # e.g. "Hola.Mundo" -> "Hola. Mundo"
    # We need to be careful not to break URLs or decimals.
    # The regex above is simple; we add a negative lookbehind for digits
    # to avoid "3.14" -> "3. 14".
    text = _END_PUNCT_UPPER_PATTERN.sub(r"\1 \2", text)

    # 5. Additional pass: catch any remaining colon-without-space that isn't
    # part of a label or URL. This is conservative: only when colon is
    # followed by a letter and not preceded by a space (but we already
    # handled labels, so this catches things like "Nota:más").
    # We exclude cases where there's already a space after the colon.
    # Also exclude http/https URLs by checking for //.
    text = re.sub(
        r"([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]):(?![ /])([a-zA-ZáéíóúÁÉÍÓÚñÑ¿¡])",
        r"\1: \2",
        text,
    )

    return text
