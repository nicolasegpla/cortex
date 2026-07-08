import { useEffect, useState } from 'react';

import { Button, Input } from '@/presentation/components/atoms';
import { CountryCitySelect } from '@/presentation/components/molecules';
import { joinArray, parseArray } from '@/shared/arrayUtils';
import { normalizeFormPayload } from '@/shared/formUtils';
import { apiClient } from '@/services/api/client';

import type { CoffeeFarm } from './CoffeeFarmList';

import './CoffeeFarmForm.scss';

interface CoffeeFarmFormData {
    nombre_finca: string;
    razon_social: string;
    nit: string;
    marca: string;
    direccion: string;
    departamento: string;
    ciudad: string;
    pais: string;
    nombre_contacto: string;
    celular: string;
    correo: string;
    tipo_actividad: string;
    hectareas_totales: string;
    hectareas_cafe: string;
    numero_arboles: string;
    variedades_sembradas: string;
    tipo_proceso: string;
    puntaje_cafe: string;
    nivel_tecnificacion: string;
    equipos: string;
    observaciones: string;
    oportunidades: string;
}

export interface CoffeeFarmFormProps {
    initialData?: CoffeeFarm;
    id?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onSavingChange?: (saving: boolean) => void;
}

const EMPTY_FORM: CoffeeFarmFormData = {
    nombre_finca: '',
    razon_social: '',
    nit: '',
    marca: '',
    direccion: '',
    departamento: '',
    ciudad: '',
    pais: '',
    nombre_contacto: '',
    celular: '',
    correo: '',
    tipo_actividad: '',
    hectareas_totales: '',
    hectareas_cafe: '',
    numero_arboles: '',
    variedades_sembradas: '',
    tipo_proceso: '',
    puntaje_cafe: '',
    nivel_tecnificacion: '',
    equipos: '',
    observaciones: '',
    oportunidades: '',
};

const LOWERCASE_FIELDS = [
    'nombre_finca',
    'razon_social',
    'nit',
    'marca',
    'direccion',
    'departamento',
    'nombre_contacto',
    'celular',
    'correo',
    'hectareas_totales',
    'hectareas_cafe',
    'puntaje_cafe',
    'variedades_sembradas',
    'equipos',
    'observaciones',
    'oportunidades',
];

export function CoffeeFarmForm({ initialData, id, onSuccess, onCancel, onSavingChange }: CoffeeFarmFormProps) {
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

        const loadFarm = async () => {
            setLoading(true);
            setNotFound(false);

            try {
                const farm = await apiClient.get<CoffeeFarm>(`/coffee-farms/${id}`);
                setFormData(transformForForm(farm));
            } catch (err) {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        loadFarm();
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
                variedades_sembradas: parseArray(formData.variedades_sembradas),
                equipos: parseArray(formData.equipos),
                numero_arboles: formData.numero_arboles ? parseInt(formData.numero_arboles, 10) : null,
                hectareas_totales: formData.hectareas_totales !== '' ? formData.hectareas_totales : null,
                hectareas_cafe: formData.hectareas_cafe !== '' ? formData.hectareas_cafe : null,
                puntaje_cafe: formData.puntaje_cafe !== '' ? formData.puntaje_cafe : null,
                tipo_actividad: formData.tipo_actividad || null,
                tipo_proceso: formData.tipo_proceso || null,
                nivel_tecnificacion: formData.nivel_tecnificacion || null,
            }, LOWERCASE_FIELDS);

            if (id) {
                await apiClient.put(`/coffee-farms/${id}`, payload);
            } else {
                await apiClient.post('/coffee-farms', payload);
            }

            onSuccess();
        } catch (err) {
            setError(isEditMode ? 'Error al guardar los cambios' : 'Error al crear la finca de café');
        } finally {
            setSaving(false);
            onSavingChange?.(false);
        }
    };

    if (loading) {
        return <div className="coffee-farm-form">Cargando finca de café...</div>;
    }

    if (notFound) {
        return (
            <div className="coffee-farm-form">
                <h2>Registro no encontrado</h2>
                <p>La finca de café solicitada no existe o no está disponible.</p>
                <Button variant="secondary" onClick={onCancel}>Volver a fincas de café</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="coffee-farm-form page-form">
            <h2>{isEditMode ? 'Editar Finca de Café' : 'Crear Finca de Café'}</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <fieldset className="form-section">
                <legend>Identificación</legend>
                <Input
                    label="Nombre de la Finca"
                    name="nombre_finca"
                    value={formData.nombre_finca}
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
                <Input
                    label="Marca"
                    name="marca"
                    value={formData.marca}
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
                <div className="form-field">
                    <label htmlFor="tipo_actividad">Tipo de Actividad</label>
                    <select
                        id="tipo_actividad"
                        name="tipo_actividad"
                        value={formData.tipo_actividad}
                        onChange={handleChange}
                    >
                        <option value="">Seleccione tipo...</option>
                        <option value="Productor">Productor</option>
                        <option value="Cooperativa">Cooperativa</option>
                        <option value="Asociacion">Asociación</option>
                        <option value="Exportador">Exportador</option>
                        <option value="Tostador">Tostador</option>
                    </select>
                </div>
                <Input
                    label="Hectáreas Totales"
                    name="hectareas_totales"
                    value={formData.hectareas_totales}
                    onChange={handleChange}
                    placeholder="ej: 12.50"
                />
                <Input
                    label="Hectáreas de Café"
                    name="hectareas_cafe"
                    value={formData.hectareas_cafe}
                    onChange={handleChange}
                    placeholder="ej: 8.00"
                />
                <Input
                    label="Número de Árboles"
                    name="numero_arboles"
                    type="number"
                    value={formData.numero_arboles}
                    onChange={handleChange}
                />
                <Input
                    label="Variedades Sembradas (separado por comas)"
                    name="variedades_sembradas"
                    value={formData.variedades_sembradas}
                    onChange={handleChange}
                    placeholder="ej: Castillo, Caturra, Geisha"
                />
                <div className="form-field">
                    <label htmlFor="tipo_proceso">Tipo de Proceso</label>
                    <select
                        id="tipo_proceso"
                        name="tipo_proceso"
                        value={formData.tipo_proceso}
                        onChange={handleChange}
                    >
                        <option value="">Seleccione proceso...</option>
                        <option value="Lavado">Lavado</option>
                        <option value="Natural">Natural</option>
                        <option value="Honey">Honey</option>
                        <option value="Anaerobico">Anaeróbico</option>
                        <option value="Maceracion carbonica">Maceraci&oacute;n Carb&oacute;nica</option>
                    </select>
                </div>
                <Input
                    label="Puntaje del Café"
                    name="puntaje_cafe"
                    value={formData.puntaje_cafe}
                    onChange={handleChange}
                    placeholder="ej: 86.5"
                />
                <div className="form-field">
                    <label htmlFor="nivel_tecnificacion">Nivel de Tecnificación</label>
                    <select
                        id="nivel_tecnificacion"
                        name="nivel_tecnificacion"
                        value={formData.nivel_tecnificacion}
                        onChange={handleChange}
                    >
                        <option value="">Seleccione nivel...</option>
                        <option value="Manual">Manual</option>
                        <option value="Semi automatizado">Semi automatizado</option>
                        <option value="Tecnificado">Tecnificado</option>
                    </select>
                </div>
            </fieldset>

            <fieldset className="form-section">
                <legend>Equipo</legend>
                <Input
                    label="Equipos (separado por comas)"
                    name="equipos"
                    value={formData.equipos}
                    onChange={handleChange}
                    placeholder="ej: Secadero, Despulpadora"
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

            <div className="coffee-farm-form__actions">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? (isEditMode ? 'Guardando...' : 'Creando...') : (isEditMode ? 'Guardar Cambios' : 'Crear Finca de Café')}
                </Button>
            </div>
        </form>
    );
}

function transformForForm(farm: CoffeeFarm): CoffeeFarmFormData {
    return {
        nombre_finca: farm.nombre_finca ?? '',
        razon_social: farm.razon_social ?? '',
        nit: farm.nit ?? '',
        marca: farm.marca ?? '',
        direccion: farm.direccion ?? '',
        departamento: farm.departamento ?? '',
        ciudad: farm.ciudad ?? '',
        pais: farm.pais ?? '',
        nombre_contacto: farm.nombre_contacto ?? '',
        celular: farm.celular ?? '',
        correo: farm.correo ?? '',
        tipo_actividad: farm.tipo_actividad ?? '',
        hectareas_totales: farm.hectareas_totales ?? '',
        hectareas_cafe: farm.hectareas_cafe ?? '',
        numero_arboles: farm.numero_arboles != null ? String(farm.numero_arboles) : '',
        variedades_sembradas: joinArray(farm.variedades_sembradas),
        tipo_proceso: farm.tipo_proceso ?? '',
        puntaje_cafe: farm.puntaje_cafe ?? '',
        nivel_tecnificacion: farm.nivel_tecnificacion ?? '',
        equipos: joinArray(farm.equipos),
        observaciones: farm.observaciones ?? '',
        oportunidades: farm.oportunidades ?? '',
    };
}
