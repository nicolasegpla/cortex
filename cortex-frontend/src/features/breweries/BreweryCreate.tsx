import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { apiClient } from '@/services/api/client';

export function BreweryCreate() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        nombre_cerveceria: '',
        razon_social: '',
        nit: '',
        ciudad: '',
        pais: '',
        tipo_operacion: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            await apiClient.post('/breweries', formData);
            navigate('/breweries');
        } catch (err) {
            setError('Failed to create brewery');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="brewery-create">
            <h2>Create Brewery</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="page-form">
                <Input
                    label="Brewery Name *"
                    name="nombre_cerveceria"
                    value={formData.nombre_cerveceria}
                    onChange={handleChange}
                    required
                />

                <Input
                    label="Legal Name"
                    name="razon_social"
                    value={formData.razon_social}
                    onChange={handleChange}
                />

                <Input
                    label="Tax ID (NIT)"
                    name="nit"
                    value={formData.nit}
                    onChange={handleChange}
                />

                <Input
                    label="City"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                />

                <Input
                    label="Country"
                    name="pais"
                    value={formData.pais}
                    onChange={handleChange}
                />

                <div className="form-field">
                    <label htmlFor="tipo_operacion">Operation Type</label>
                    <select
                        id="tipo_operacion"
                        name="tipo_operacion"
                        value={formData.tipo_operacion}
                        onChange={handleChange}
                    >
                        <option value="">Select type...</option>
                        <option value="maquila">Maquila</option>
                        <option value="planta_propia">Own Plant</option>
                        <option value="ambos">Both</option>
                    </select>
                </div>

                <Button type="submit" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Brewery'}
                </Button>
            </form>
        </div>
    );
}
