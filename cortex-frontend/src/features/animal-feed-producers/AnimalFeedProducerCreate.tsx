import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { apiClient } from '@/services/api/client';

export function AnimalFeedProducerCreate() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        // Identificación
        razon_social: '',
        marca: '',
        nit: '',
        // Ubicación
        direccion: '',
        departamento: '',
        ciudad: '',
        pais: '',
        // Contacto
        nombre_contacto: '',
        celular: '',
        correo: '',
        // Producción
        especies_manejadas: '',
        productos_fabricados: '',
        // Notas
        observaciones: '',
        oportunidades: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const parseArray = (value: string): string[] => {
        if (!value.trim()) return [];
        return value.split(',').map(item => item.trim()).filter(Boolean);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const payload = {
                ...formData,
                especies_manejadas: parseArray(formData.especies_manejadas),
                productos_fabricados: parseArray(formData.productos_fabricados),
            };

            await apiClient.post('/animal-feed-producers', payload);
            navigate('/animal-feed-producers');
        } catch (err) {
            setError('Error al crear el productor de alimentos para animales');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animal-feed-producer-create">
            <h2>Crear Productor de Alimentos para Animales</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="page-form">
                <fieldset className="form-section">
                    <legend>Identificación</legend>
                    <Input
                        label="Razón Social *"
                        name="razon_social"
                        value={formData.razon_social}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Marca"
                        name="marca"
                        value={formData.marca}
                        onChange={handleChange}
                    />
                    <Input
                        label="NIT"
                        name="nit"
                        value={formData.nit}
                        onChange={handleChange}
                    />
                </fieldset>

                <fieldset className="form-section">
                    <legend>Ubicación</legend>
                    <Input
                        label="Dirección"
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleChange}
                    />
                    <Input
                        label="Departamento"
                        name="departamento"
                        value={formData.departamento}
                        onChange={handleChange}
                    />
                    <Input
                        label="Ciudad"
                        name="ciudad"
                        value={formData.ciudad}
                        onChange={handleChange}
                    />
                    <Input
                        label="País"
                        name="pais"
                        value={formData.pais}
                        onChange={handleChange}
                    />
                </fieldset>

                <fieldset className="form-section">
                    <legend>Contacto</legend>
                    <Input
                        label="Nombre de Contacto"
                        name="nombre_contacto"
                        value={formData.nombre_contacto}
                        onChange={handleChange}
                    />
                    <Input
                        label="Celular"
                        name="celular"
                        value={formData.celular}
                        onChange={handleChange}
                    />
                    <Input
                        label="Correo"
                        name="correo"
                        type="email"
                        value={formData.correo}
                        onChange={handleChange}
                    />
                </fieldset>

                <fieldset className="form-section">
                    <legend>Producción</legend>
                    <Input
                        label="Especies Manejadas (separado por comas)"
                        name="especies_manejadas"
                        value={formData.especies_manejadas}
                        onChange={handleChange}
                        placeholder="ej: Bovinos, Porcinos, Aves"
                    />
                    <Input
                        label="Productos Fabricados (separado por comas)"
                        name="productos_fabricados"
                        value={formData.productos_fabricados}
                        onChange={handleChange}
                        placeholder="ej: Concentrado, Premezcla"
                    />
                </fieldset>

                <fieldset className="form-section">
                    <legend>Notas</legend>
                    <div className="form-field">
                        <label htmlFor="observaciones">Observaciones</label>
                        <textarea
                            id="observaciones"
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={handleChange}
                            rows={4}
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="oportunidades">Oportunidades</label>
                        <textarea
                            id="oportunidades"
                            name="oportunidades"
                            value={formData.oportunidades}
                            onChange={handleChange}
                            rows={4}
                        />
                    </div>
                </fieldset>

                <Button type="submit" disabled={saving}>
                    {saving ? 'Creando...' : 'Crear Productor'}
                </Button>
            </form>
        </div>
    );
}
