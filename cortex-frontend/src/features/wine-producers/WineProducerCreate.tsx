import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { apiClient } from '@/services/api/client';

export function WineProducerCreate() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        // Identificación
        nombre_comercial: '',
        razon_social: '',
        nit: '',
        // Ubicación
        direccion: '',
        ciudad: '',
        pais: '',
        // Contacto
        nombre_contacto: '',
        celular: '',
        correo: '',
        // Insumos
        levaduras_utilizadas: '',
        nutrientes_utilizados: '',
        conservantes_utilizados: '',
        clarificantes_utilizados: '',
        // Producción
        marcas: '',
        tipo_uva: '',
        tipo_vino: '',
        botellas_utilizadas: '',
        produccion_anual: '',
        fuente_azucar: '',
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
                marcas: parseArray(formData.marcas),
                tipo_uva: parseArray(formData.tipo_uva),
                tipo_vino: parseArray(formData.tipo_vino),
                levaduras_utilizadas: parseArray(formData.levaduras_utilizadas),
                botellas_utilizadas: parseArray(formData.botellas_utilizadas),
                nutrientes_utilizados: parseArray(formData.nutrientes_utilizados),
                conservantes_utilizados: parseArray(formData.conservantes_utilizados),
                clarificantes_utilizados: parseArray(formData.clarificantes_utilizados),
            };

            await apiClient.post('/wine-producers', payload);
            navigate('/wine-producers');
        } catch (err) {
            setError('Error al crear el productor de vino');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="wine-producer-create">
            <h2>Crear Productor de Vino</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="page-form">
                <fieldset className="form-section">
                    <legend>Identificación</legend>
                    <Input
                        label="Nombre Comercial *"
                        name="nombre_comercial"
                        value={formData.nombre_comercial}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Razón Social"
                        name="razon_social"
                        value={formData.razon_social}
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
                    <legend>Insumos</legend>
                    <Input
                        label="Levaduras Utilizadas (separado por comas)"
                        name="levaduras_utilizadas"
                        value={formData.levaduras_utilizadas}
                        onChange={handleChange}
                        placeholder="ej: Levadura 1, Levadura 2"
                    />
                    <Input
                        label="Nutrientes Utilizados (separado por comas)"
                        name="nutrientes_utilizados"
                        value={formData.nutrientes_utilizados}
                        onChange={handleChange}
                        placeholder="ej: Nutriente A, Nutriente B"
                    />
                    <Input
                        label="Conservantes Utilizados (separado por comas)"
                        name="conservantes_utilizados"
                        value={formData.conservantes_utilizados}
                        onChange={handleChange}
                        placeholder="ej: Conservante A, Conservante B"
                    />
                    <Input
                        label="Clarificantes Utilizados (separado por comas)"
                        name="clarificantes_utilizados"
                        value={formData.clarificantes_utilizados}
                        onChange={handleChange}
                        placeholder="ej: Clarificante A, Clarificante B"
                    />
                </fieldset>

                <fieldset className="form-section">
                    <legend>Producción</legend>
                    <Input
                        label="Marcas (separado por comas)"
                        name="marcas"
                        value={formData.marcas}
                        onChange={handleChange}
                        placeholder="ej: Real, Reserva"
                    />
                    <Input
                        label="Tipo de Uva (separado por comas)"
                        name="tipo_uva"
                        value={formData.tipo_uva}
                        onChange={handleChange}
                        placeholder="ej: Cabernet Sauvignon, Merlot"
                    />
                    <Input
                        label="Tipo de Vino (separado por comas)"
                        name="tipo_vino"
                        value={formData.tipo_vino}
                        onChange={handleChange}
                        placeholder="ej: Tinto, Rosado"
                    />
                    <Input
                        label="Botellas Utilizadas (separado por comas)"
                        name="botellas_utilizadas"
                        value={formData.botellas_utilizadas}
                        onChange={handleChange}
                        placeholder="ej: Botella 750ml, Botella 375ml"
                    />
                    <Input
                        label="Producción Anual"
                        name="produccion_anual"
                        value={formData.produccion_anual}
                        onChange={handleChange}
                    />
                    <Input
                        label="Fuente de Azúcar"
                        name="fuente_azucar"
                        value={formData.fuente_azucar}
                        onChange={handleChange}
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
