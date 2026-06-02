import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { apiClient } from '@/services/api/client';

export function BreweryCreate() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        // Identificación
        nombre_cerveceria: '',
        razon_social: '',
        nit: '',
        // Ubicación
        direccion: '',
        ciudad: '',
        pais: '',
        // Contacto
        nombre_contacto: '',
        nombre_cervecero: '',
        celular_1: '',
        celular_2: '',
        correo: '',
        // Insumos
        maltas_utilizadas: '',
        lupulos_utilizados: '',
        levaduras_utilizadas: '',
        utiliza_otros_productos: false,
        // Producción
        estilos_cerveza: '',
        tipo_operacion: '',
        // Equipo
        marca_equipo: '',
        capacidad_brewhouse: '',
        capacidad_fermentacion: '',
        litros_mes: '',
        calidad_equipo: '',
        // Comercial
        formatos_venta: '',
        donde_vende: '',
        // Notas
        observaciones: '',
        oportunidades: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
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
                maltas_utilizadas: parseArray(formData.maltas_utilizadas),
                lupulos_utilizados: parseArray(formData.lupulos_utilizados),
                levaduras_utilizadas: parseArray(formData.levaduras_utilizadas),
                estilos_cerveza: parseArray(formData.estilos_cerveza),
                formatos_venta: parseArray(formData.formatos_venta),
                litros_mes: formData.litros_mes ? parseInt(formData.litros_mes, 10) : null,
            };
            
            await apiClient.post('/breweries', payload);
            navigate('/breweries');
        } catch (err) {
            setError('Error al crear la cervecería');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="brewery-create">
            <h2>Crear Cervecería</h2>

            {error && (
                <div className="error" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="page-form">
                <fieldset className="form-section">
                    <legend>Identificación</legend>
                    <Input
                        label="Nombre de la Cervecería *"
                        name="nombre_cerveceria"
                        value={formData.nombre_cerveceria}
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
                        label="Nombre del Cervecero"
                        name="nombre_cervecero"
                        value={formData.nombre_cervecero}
                        onChange={handleChange}
                    />
                    <Input
                        label="Celular 1"
                        name="celular_1"
                        value={formData.celular_1}
                        onChange={handleChange}
                    />
                    <Input
                        label="Celular 2"
                        name="celular_2"
                        value={formData.celular_2}
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
                        label="Malta que Utiliza (separado por comas)"
                        name="maltas_utilizadas"
                        value={formData.maltas_utilizadas}
                        onChange={handleChange}
                        placeholder="ej: Pilsner, Munich, Caramelo"
                    />
                    <Input
                        label="Lúpulos que Utiliza (separado por comas)"
                        name="lupulos_utilizados"
                        value={formData.lupulos_utilizados}
                        onChange={handleChange}
                        placeholder="ej: Cascade, Citra, Simcoe"
                    />
                    <Input
                        label="Levaduras que Utiliza (separado por comas)"
                        name="levaduras_utilizadas"
                        value={formData.levaduras_utilizadas}
                        onChange={handleChange}
                        placeholder="ej: US-05, S-04, Belgian Ale"
                    />
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="utiliza_otros_productos"
                            checked={formData.utiliza_otros_productos}
                            onChange={handleChange}
                        />
                        Utiliza Otros Productos
                    </label>
                </fieldset>

                <fieldset className="form-section">
                    <legend>Producción</legend>
                    <Input
                        label="Estilos de Cerveza que Elabora (separado por comas)"
                        name="estilos_cerveza"
                        value={formData.estilos_cerveza}
                        onChange={handleChange}
                        placeholder="ej: IPA, Stout, Lager"
                    />
                    <div className="form-field">
                        <label htmlFor="tipo_operacion">Tipo de Operación</label>
                        <select
                            id="tipo_operacion"
                            name="tipo_operacion"
                            value={formData.tipo_operacion}
                            onChange={handleChange}
                        >
                            <option value="">Seleccione tipo...</option>
                            <option value="maquila">Maquila</option>
                            <option value="planta_propia">Planta Propia</option>
                            <option value="ambos">Ambos</option>
                        </select>
                    </div>
                </fieldset>

                <fieldset className="form-section">
                    <legend>Equipo</legend>
                    <Input
                        label="Marca del Equipo"
                        name="marca_equipo"
                        value={formData.marca_equipo}
                        onChange={handleChange}
                    />
                    <Input
                        label="Capacidad del Brewhouse"
                        name="capacidad_brewhouse"
                        value={formData.capacidad_brewhouse}
                        onChange={handleChange}
                        placeholder="ej: 500L"
                    />
                    <Input
                        label="Capacidad de Fermentación"
                        name="capacidad_fermentacion"
                        value={formData.capacidad_fermentacion}
                        onChange={handleChange}
                        placeholder="ej: 2000L"
                    />
                    <Input
                        label="Litros que Hace al Mes"
                        name="litros_mes"
                        type="number"
                        value={formData.litros_mes}
                        onChange={handleChange}
                    />
                    <Input
                        label="Calidad del Equipo"
                        name="calidad_equipo"
                        value={formData.calidad_equipo}
                        onChange={handleChange}
                    />
                </fieldset>

                <fieldset className="form-section">
                    <legend>Comercial</legend>
                    <Input
                        label="Formatos de Venta (separado por comas)"
                        name="formatos_venta"
                        value={formData.formatos_venta}
                        onChange={handleChange}
                        placeholder="ej: Lata, Botella, Barril"
                    />
                    <Input
                        label="En Dónde Vende la Cerveza"
                        name="donde_vende"
                        value={formData.donde_vende}
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
                    {saving ? 'Creando...' : 'Crear Cervecería'}
                </Button>
            </form>
        </div>
    );
}
