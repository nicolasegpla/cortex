# textarea-atom Specification

## Purpose

Reusable textarea input atom following the Input atom's BEM pattern (`textarea-field`, `textarea-field__label`, `textarea-field__control`).

## Requirements

### Requirement: Textarea renders with label and control

The Textarea atom MUST render a `<label>` containing text and a nested `<textarea>`. The label/control association MUST resolve via `getByLabelText`.

#### Scenario: Textarea renders with accessible label

- GIVEN `<Textarea label="Mensaje" />`
- WHEN rendered
- THEN `screen.getByLabelText('Mensaje')` resolves to a `<textarea>`

### Requirement: Textarea forwards required, placeholder, and name

The Textarea SHALL forward `required`, `placeholder`, and `name` props to the underlying `<textarea>` element.

#### Scenario: Required attribute is forwarded

- GIVEN `<Textarea label="Mensaje" required />`
- WHEN rendered
- THEN the `<textarea>` has the `required` attribute

#### Scenario: Placeholder is forwarded

- GIVEN `<Textarea label="Mensaje" placeholder="Escribe aquí..." />`
- WHEN rendered
- THEN `screen.getByPlaceholderText('Escribe aquí...')` resolves

#### Scenario: Name attribute is forwarded

- GIVEN `<Textarea label="Mensaje" name="message" />`
- WHEN rendered
- THEN the `<textarea>` has `name="message"`
