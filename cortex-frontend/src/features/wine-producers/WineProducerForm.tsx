import { useEffect, useState } from 'react';

import { Button, Input } from '@/presentation/components/atoms';
import { CountryCitySelect } from '@/presentation/components/molecules';
import { joinArray, parseArray } from '@/shared/arrayUtils';
import { normalizeFormPayload } from '@/shared/formUtils';
import { apiClient } from '@/services/api/client';

import type { WineProducer } from './WineProducerList';

import './WineProducerForm.scss';

interface WineProducerFormData {
    nombre_comercial: string;
    razon_social: string;
    nit: string;
    direccion: string;
    ciudad: string;
    pais: string;
    nombre_contacto: string;
    celular: string;
    correo: string;
    marcas: string;
    fuente_azucar: string;
    tipo_uva: string;
    tipo_vino: string;
    levaduras_utilizadas: string;
    botellas_utilizadas: string;
    nutrientes_utilizados: string;
    conservantes_utilizados: string;
    clarificantes_utilizados: string;
    produccion_anual: string;
    observaciones: string;
    oportunidades: string;
}

export interface WineProducerFormProps {
    initialData?: WineProducer;
    id?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onSavingChange?: (saving: boolean) => void;
}

const EMPTY_FORM: WineProducerFormData = {
    nombre_comercial: '',
    razon_social: '',
    nit: '',
    direccion: '',
    ciudad: '',
    pais: '',
    nombre_contacto: '',
    celular: '',
    correo: '',
    marcas: '',
    fuente_azucar: '',
    tipo_uva: '',
    tipo_vino: '',
    levaduras_utilizadas: '',
    botellas_utilizadas: '',
    nutrientes_utilizados: '',
    conservantes_utilizados: '',
    clarificantes_utilizados: '',
    produccion_anual: '',
    observaciones: '',
    oportunidades: '',
};

const LOWERCASE_FIELDS = [
    'nombre_comercial',
    'razon_social',
    'nit',
    'direccion',
    'nombre_contacto',
    'celular',
    'correo',
    'marcas',
    'fuente_azucar',
    'tipo_uva',
    'tipo_vino',
    'levaduras_utilizadas',
    'botellas_utilizadas',
    'nutrientes_utilizados',
    'conservantes_utilizados',
    'clarificantes_utilizados',
    'produccion_anual',
    'observaciones',
    'oportunidades',
];

export function WineProducerForm({ initialData, id, onSuccess, onCancel, onSavingChange }: WineProducerFormProps) {
    const isEditMode = Boolean(initialData ?? id);
    const [loading, setLoading] = useState(isEditMode && !initialData);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        if (initialData) {
            setFormData(transformForForm(initialData));
            setLoading(false);
            setNotFound(false);
            return;
        }

        if (!id) {
            setFormData({ ...EMPTY_FORM });
            setLoading(false);
            setNotFound(false);
            return;
        }

        const loadProducer = async () => {
            setLoading(true);
            setNotFound(false);

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
    }, [initialData, id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        onSavingChange?.(true);

        try {
            const payload = normalizeFormPayload({
                ...formData,
                marcas: parseArray(formData.marcas),
                tipo_uva: parseArray(formData.tipo_uva),
                tipo_vino: parseArray(formData.tipo_vino),
                levaduras_utilizadas: parseArray(formData.levaduras_utilizadas),
                botellas_utilizadas: parseArray(formData.botellas_utilizadas),
                nutrientes_utilizados: parseArray(formData.nutrientes_utilizados),
                conservantes_utilizados: parseArray(formData.conservantes_utilizados),
                clarificantes_utilizados: parseArray(formData.clarificantes_utilizados),
            }, LOWERCASE_FIELDS);

            if (id) {
                await apiClient.put(`/wine-producers/${id}`, payload);
            } else {
                await apiClient.post('/wine-producers', payload);
            }

            onSuccess();
        } catch (err) {
            setError(isEditMode ? 'Error al guardar los cambios' : 'Error al crear el productor de vino');
        } finally {
            setSaving(false);
            onSavingChange?.(false);
        }
    };

    if (loading) {
        return <div className="wine-producer-form">Cargando productor de vino...</div>;
    }

    if (notFound) {
        return (
            <div className="wine-producer-form">
                <h2>Registro no encontrado</h2>
                <p>El productor de vino solicitado no existe o no está disponible.</p>
                <Button variant="secondary" onClick={onCancel}>Volver a productores de vino</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="wine-producer-form page-form">
            <h2>{isEditMode ? 'Editar Productor de Vino' : 'Crear Productor de Vino'}</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <fieldset className="form-section">
                <legend>Identificación</legend>
                <Input
                    label="Nombre Comercial"
                    name="nombre_comercial"
                    value={formData.nombre_comercial}
                    onChange={handleChange}
                    required
                    showRequiredAsterisk
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
                <CountryCitySelect
                    pais={formData.pais}
                    ciudad={formData.ciudad}
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

            <div className="wine-producer-form__actions">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? (isEditMode ? 'Guardando...' : 'Creando...') : (isEditMode ? 'Guardar Cambios' : 'Crear Productor')}
                </Button>
            </div>
        </form>
    );
}

function transformForForm(producer: WineProducer): WineProducerFormData {
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
        marcas: joinArray(producer.marcas),
        fuente_azucar: producer.fuente_azucar ?? '',
        tipo_uva: joinArray(producer.tipo_uva),
        tipo_vino: joinArray(producer.tipo_vino),
        levaduras_utilizadas: joinArray(producer.levaduras_utilizadas),
        botellas_utilizadas: joinArray(producer.botellas_utilizadas),
        nutrientes_utilizados: joinArray(producer.nutrientes_utilizados),
        conservantes_utilizados: joinArray(producer.conservantes_utilizados),
        clarificantes_utilizados: joinArray(producer.clarificantes_utilizados),
        produccion_anual: producer.produccion_anual ?? '',
        observaciones: producer.observaciones ?? '',
        oportunidades: producer.oportunidades ?? '',
    };
}
