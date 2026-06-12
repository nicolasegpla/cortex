import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { apiClient } from '@/services/api/client';

export function CoffeeFarmCreate() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        // Identificación
        nombre_finca: '',
        razon_social: '',
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
        tipo_actividad: '',
        hectareas_totales: '',
        hectareas_cafe: '',
        numero_arboles: '',
        variedades_sembradas: '',
        tipo_proceso: '',
        puntaje_cafe: '',
        nivel_tecnificacion: '',
        // Equipo
        equipos: '',
        // Notas
        observaciones: '',
        oportunidades: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
                variedades_sembradas: parseArray(formData.variedades_sembradas),
                equipos: parseArray(formData.equipos),
                numero_arboles: formData.numero_arboles ? parseInt(formData.numero_arboles, 10) : null,
                hectareas_totales: formData.hectareas_totales || null,
                hectareas_cafe: formData.hectareas_cafe || null,
                puntaje_cafe: formData.puntaje_cafe || null,
            };

            await apiClient.post('/coffee-farms', payload);
            navigate('/coffee-farms');
        } catch (err) {
            setError('Error al crear la finca de café');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="coffee-farm-create">
            <h2>Crear Finca de Café</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="page-form">
                <fieldset className="form-section">
                    <legend>Identificación</legend>
                    <Input
                        label="Nombre de la Finca *"
                        name="nombre_finca"
                        value={formData.nombre_finca}
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

                <Button type="submit" disabled={saving}>
                    {saving ? 'Creando...' : 'Crear Finca de Café'}
                </Button>
            </form>
        </div>
    );
}
