import { Button, Input } from '@/presentation/components/atoms';

import './phone-list-input.scss';

export interface PhoneListInputProps {
    phones: string[];
    onChange: (phones: string[]) => void;
    disabled?: boolean;
}

export function PhoneListInput({ phones, onChange, disabled }: PhoneListInputProps) {
    const handleAdd = () => {
        onChange([...phones, '']);
    };

    const handleRemove = (index: number) => {
        onChange(phones.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, value: string) => {
        const updated = [...phones];
        updated[index] = value;
        onChange(updated);
    };

    return (
        <fieldset className="phone-list-input">
            <legend className="phone-list-input__legend">Teléfonos</legend>

            <div className="phone-list-input__rows">
                {phones.map((phone, index) => (
                    <div key={index} className="phone-list-input__row">
                        <Input
                            className="phone-list-input__input"
                            label={`Teléfono ${index + 1}`}
                            name={`phone-${index}`}
                            type="tel"
                            value={phone}
                            onChange={(e) => handleChange(index, e.target.value)}
                            disabled={disabled}
                        />
                        <Button
                            className="phone-list-input__remove"
                            type="button"
                            variant="secondary"
                            onClick={() => handleRemove(index)}
                            disabled={disabled}
                            aria-label={`Eliminar teléfono ${index + 1}`}
                        >
                            Eliminar
                        </Button>
                    </div>
                ))}
            </div>

            <Button
                className="phone-list-input__add"
                type="button"
                variant="secondary"
                onClick={handleAdd}
                disabled={disabled}
            >
                Agregar teléfono
            </Button>
        </fieldset>
    );
}
