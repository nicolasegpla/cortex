import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { joinArray, parseArray } from '@/shared/arrayUtils';
import { apiClient } from '@/services/api/client';

import type { WineProducer } from './WineProducerList';

export function WineProducerEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
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

    useEffect(() => {
        const loadProducer = async () => {
            if (!id) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            try {
                const producer = await apiClient.get<WineProducer>(`/wine-producers/${id}`);
                setFormData(transformForForm(producer));
            } catch (err) {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        loadProducer();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

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

            await apiClient.put(`/wine-producers/${id}`, payload);
            navigate('/wine-producers');
        } catch (err) {
            setError('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="wine-producer-edit">Cargando productor de vino...</div>;
    }

    if (notFound) {
        return (
            <div className="wine-producer-edit">
                <h2>Registro no encontrado</h2>
                <p>El productor de vino solicitado no existe o no está disponible.</p>
                <Link to="/wine-producers">Volver a productores de vino</Link>
            </div>
        );
    }

    return (
        <div className="wine-producer-edit">
            <h2>Editar Productor de Vino</h2>

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
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </form>
        </div>
    );
}

function transformForForm(producer: WineProducer) {
    return {
        nombre_comercial: producer.nombre_comercial ?? '',
        razon_social: producer.razon_social ?? '',
        nit: producer.nit ?? '',
        direccion: producer.direccion ?? '',
        ciudad: producer.ciudad ?? '',
        pais: producer.pais ?? '',
        nombre_contacto: producer.nombre_contacto ?? '',
        celular: producer.celular ?? '',
        correo: producer.correo ?? '',
        levaduras_utilizadas: joinArray(producer.levaduras_utilizadas),
        nutrientes_utilizados: joinArray(producer.nutrientes_utilizados),
        conservantes_utilizados: joinArray(producer.conservantes_utilizados),
        clarificantes_utilizados: joinArray(producer.clarificantes_utilizados),
        marcas: joinArray(producer.marcas),
        tipo_uva: joinArray(producer.tipo_uva),
        tipo_vino: joinArray(producer.tipo_vino),
        botellas_utilizadas: joinArray(producer.botellas_utilizadas),
        produccion_anual: producer.produccion_anual ?? '',
        fuente_azucar: producer.fuente_azucar ?? '',
        observaciones: producer.observaciones ?? '',
        oportunidades: producer.oportunidades ?? '',
    };
}
