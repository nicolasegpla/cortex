export const COUNTRY_CITY_MAP = {
    Colombia: [
        'Bogotá D.C.',
        'Medellín',
        'Cali',
        'Barranquilla',
        'Cartagena de Indias',
        'Bucaramanga',
        'Cúcuta',
        'Pereira',
        'Santa Marta',
        'Ibagué',
        'Manizales',
        'Villavicencio',
        'Pasto',
        'Neiva',
        'Armenia',
        'Popayán',
        'Valledupar',
        'Montería',
        'Sincelejo',
        'Tunja',
        'Riohacha',
        'Florencia',
        'Quibdó',
        'Yopal',
        'Mocoa',
        'San José del Guaviare',
        'Arauca',
        'San Andrés',
        'Leticia',
        'Mitú',
        'Puerto Carreño',
        'Inírida',
    ],
    Venezuela: [
        'Caracas',
        'Maracaibo',
        'Valencia',
        'Barquisimeto',
        'Maracay',
        'Ciudad Bolívar',
        'San Cristóbal',
        'Mérida',
        'Barcelona',
        'Maturín',
        'Puerto La Cruz',
        'Cumaná',
        'Coro',
        'San Carlos',
        'Guanare',
        'Trujillo',
        'Tucupita',
        'San Fernando de Apure',
        'Calabozo',
        'San Juan de los Morros',
        'Los Teques',
        'La Asunción',
        'San Felipe',
    ],
} as const;

export type Country = keyof typeof COUNTRY_CITY_MAP;

export type City<T extends Country> = (typeof COUNTRY_CITY_MAP)[T][number];

export type CountryCityMapping = typeof COUNTRY_CITY_MAP;

export function getCitiesForCountry(country: string): readonly string[] {
    return COUNTRY_CITY_MAP[country as Country] ?? [];
}

export function resolveCityOptions(country: string, currentCity: string): string[] {
    const cities = [...getCitiesForCountry(country)];

    if (!currentCity) {
        return cities;
    }

    if (cities.includes(currentCity)) {
        return cities;
    }

    return [currentCity, ...cities];
}
