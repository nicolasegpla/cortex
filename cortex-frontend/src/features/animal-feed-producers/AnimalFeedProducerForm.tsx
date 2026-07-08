import { useEffect, useState } from 'react';

import { Button, Input } from '@/presentation/components/atoms';
import { CountryCitySelect } from '@/presentation/components/molecules';
import { joinArray, parseArray } from '@/shared/arrayUtils';
import { normalizeFormPayload } from '@/shared/formUtils';
import { apiClient } from '@/services/api/client';

import type { AnimalFeedProducer } from './AnimalFeedProducerList';

import './AnimalFeedProducerForm.scss';

interface AnimalFeedProducerFormData {
    razon_social: string;
    marca: string;
    nit: string;
    direccion: string;
    departamento: string;
    ciudad: string;
    pais: string;
    nombre_contacto: string;
    celular: string;
    correo: string;
    especies_manejadas: string;
    productos_fabricados: string;
    observaciones: string;
    oportunidades: string;
}

export interface AnimalFeedProducerFormProps {
    initialData?: AnimalFeedProducer;
    id?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onSavingChange?: (saving: boolean) => void;
}

const EMPTY_FORM: AnimalFeedProducerFormData = {
    razon_social: '',
    marca: '',
    nit: '',
    direccion: '',
    departamento: '',
    ciudad: '',
    pais: '',
    nombre_contacto: '',
    celular: '',
    correo: '',
    especies_manejadas: '',
    productos_fabricados: '',
    observaciones: '',
    oportunidades: '',
};

const LOWERCASE_FIELDS = [
    'razon_social',
    'marca',
    'nit',
    'direccion',
    'departamento',
    'nombre_contacto',
    'celular',
    'correo',
    'especies_manejadas',
    'productos_fabricados',
    'observaciones',
    'oportunidades',
];

export function AnimalFeedProducerForm({ initialData, id, onSuccess, onCancel, onSavingChange }: AnimalFeedProducerFormProps) {
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
                const producer = await apiClient.get<AnimalFeedProducer>(`/animal-feed-producers/${id}`);
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
                especies_manejadas: parseArray(formData.especies_manejadas),
                productos_fabricados: parseArray(formData.productos_fabricados),
            }, LOWERCASE_FIELDS);

            if (id) {
                await apiClient.put(`/animal-feed-producers/${id}`, payload);
            } else {
                await apiClient.post('/animal-feed-producers', payload);
            }

            onSuccess();
        } catch (err) {
            setError(isEditMode ? 'Error al guardar los cambios' : 'Error al crear el productor de alimentos para animales');
        } finally {
            setSaving(false);
            onSavingChange?.(false);
        }
    };

    if (loading) {
        return <div className="animal-feed-producer-form">Cargando productor de alimentos para animales...</div>;
    }

    if (notFound) {
        return (
            <div className="animal-feed-producer-form">
                <h2>Registro no encontrado</h2>
                <p>El productor de alimentos para animales solicitado no existe o no está disponible.</p>
                <Button variant="secondary" onClick={onCancel}>Volver a productores</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="animal-feed-producer-form page-form">
            <h2>{isEditMode ? 'Editar Productor de Alimentos para Animales' : 'Crear Productor de Alimentos para Animales'}</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <fieldset className="form-section">
                <legend>Identificación</legend>
                <Input
                    label="Razón Social"
                    name="razon_social"
                    value={formData.razon_social}
                    onChange={handleChange}
                    required
                    showRequiredAsterisk
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

            <div className="animal-feed-producer-form__actions">
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

function transformForForm(producer: AnimalFeedProducer): AnimalFeedProducerFormData {
    return {
        razon_social: producer.razon_social ?? '',
        marca: producer.marca ?? '',
        nit: producer.nit ?? '',
        direccion: producer.direccion ?? '',
        departamento: producer.departamento ?? '',
        ciudad: producer.ciudad ?? '',
        pais: producer.pais ?? '',
        nombre_contacto: producer.nombre_contacto ?? '',
        celular: producer.celular ?? '',
        correo: producer.correo ?? '',
        especies_manejadas: joinArray(producer.especies_manejadas),
        productos_fabricados: joinArray(producer.productos_fabricados),
        observaciones: producer.observaciones ?? '',
        oportunidades: producer.oportunidades ?? '',
    };
}
