"""Tests for response text normalization utilities."""

import pytest

from app.utils.text_normalization import normalize_response_text


class TestNormalizeResponseText:
    """Test factual-prose normalization without changing underlying facts."""

    # --- Label separation ---

    def test_separates_glued_label_nombre(self):
        """RED: 'Cerveceria 2Nombre:' → newline before label."""
        raw = "Cerveceria 2Nombre: Test Brewery"
        expected = "Cerveceria 2\nNombre: Test Brewery"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_ciudad(self):
        """TRIANGULATE: 'BogotáCiudad:' → newline before label."""
        raw = "BogotáCiudad: Bogotá"
        expected = "Bogotá\nCiudad: Bogotá"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_pais(self):
        """TRIANGULATE: 'ColombiaPaís:' → newline before label."""
        raw = "ColombiaPaís: Colombia"
        expected = "Colombia\nPaís: Colombia"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_cervecero(self):
        """RED: 'ColombiaCervecero:' → newline before label."""
        raw = "ColombiaCervecero: Juan Pérez"
        expected = "Colombia\nCervecero: Juan Pérez"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_direccion(self):
        """TRIANGULATE: 'Calle 123Dirección:' → newline before label."""
        raw = "Calle 123Dirección: Carrera 7"
        expected = "Calle 123\nDirección: Carrera 7"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_equipo(self):
        """TRIANGULATE: 'BrasserieEquipo:' → newline before label."""
        raw = "BrasserieEquipo: 500L"
        expected = "Brasserie\nEquipo: 500L"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_estilos(self):
        """TRIANGULATE: 'IPAStoutEstilos:' → newline before label."""
        raw = "IPAStoutEstilos: IPA, Stout"
        expected = "IPAStout\nEstilos: IPA, Stout"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_telefono(self):
        """TRIANGULATE: '311555Teléfono:' → newline before label."""
        raw = "311555Teléfono: 311-555-1234"
        expected = "311555\nTeléfono: 311-555-1234"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_email(self):
        """TRIANGULATE: 'contactoEmail:' → newline before label."""
        raw = "contactoEmail: test@example.com"
        expected = "contacto\nEmail: test@example.com"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_brewery(self):
        """TRIANGULATE: English label 'DataBrewery:' → newline before label."""
        raw = "DataBrewery: Test Brew"
        expected = "Data\nBrewery: Test Brew"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_city(self):
        """TRIANGULATE: English label 'HereCity:' → newline before label."""
        raw = "HereCity: Bogotá"
        expected = "Here\nCity: Bogotá"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_country(self):
        """TRIANGULATE: English label 'DataCountry:' → newline before label."""
        raw = "DataCountry: Colombia"
        expected = "Data\nCountry: Colombia"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_phone(self):
        """TRIANGULATE: English label 'InfoPhone:' → newline before label."""
        raw = "InfoPhone: 123-456"
        expected = "Info\nPhone: 123-456"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_address(self):
        """TRIANGULATE: English label 'DataAddress:' → newline before label."""
        raw = "DataAddress: Calle 1"
        expected = "Data\nAddress: Calle 1"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_equipment(self):
        """TRIANGULATE: English label 'DataEquipment:' → newline before label."""
        raw = "DataEquipment: 500L"
        expected = "Data\nEquipment: 500L"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_brewer(self):
        """TRIANGULATE: English label 'DataBrewer:' → newline before label."""
        raw = "DataBrewer: Juan"
        expected = "Data\nBrewer: Juan"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_styles(self):
        """TRIANGULATE: English label 'DataStyles:' → newline before label."""
        raw = "DataStyles: IPA"
        expected = "Data\nStyles: IPA"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_hops(self):
        """TRIANGULATE: English label 'DataHops:' → newline before label."""
        raw = "DataHops: Cascade"
        expected = "Data\nHops: Cascade"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_yeast(self):
        """TRIANGULATE: English label 'DataYeast:' → newline before label."""
        raw = "DataYeast: US-05"
        expected = "Data\nYeast: US-05"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_production(self):
        """TRIANGULATE: English label 'DataProduction:' → newline before label."""
        raw = "DataProduction: 1000L"
        expected = "Data\nProduction: 1000L"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_sales(self):
        """TRIANGULATE: English label 'DataSales:' → newline before label."""
        raw = "DataSales: Online"
        expected = "Data\nSales: Online"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_distribution(self):
        """TRIANGULATE: English label 'DataDistribution:' → newline before label."""
        raw = "DataDistribution: Nationwide"
        expected = "Data\nDistribution: Nationwide"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_cerveceria(self):
        """TRIANGULATE: Spanish label 'InfoCervecería:' → newline before label."""
        raw = "InfoCervecería: Test Brew"
        expected = "Info\nCervecería: Test Brew"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_cerveceria_no_accent(self):
        """TRIANGULATE: Spanish label 'InfoCerveceria:' → newline before label."""
        raw = "InfoCerveceria: Test Brew"
        expected = "Info\nCerveceria: Test Brew"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_observaciones(self):
        """TRIANGULATE: 'NotasObservaciones:' → newline before label."""
        raw = "NotasObservaciones: Great brewery"
        expected = "Notas\nObservaciones: Great brewery"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_oportunidades(self):
        """TRIANGULATE: 'DatosOportunidades:' → newline before label."""
        raw = "DatosOportunidades: Expansion"
        expected = "Datos\nOportunidades: Expansion"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_marca(self):
        """TRIANGULATE: 'EquipoMarca:' → newline before label."""
        raw = "EquipoMarca: Ss Brewtech"
        expected = "Equipo\nMarca: Ss Brewtech"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_capacidad(self):
        """TRIANGULATE: 'EquipoCapacidad:' → newline before label."""
        raw = "EquipoCapacidad: 1000L"
        expected = "Equipo\nCapacidad: 1000L"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_calidad(self):
        """TRIANGULATE: 'EquipoCalidad:' → newline before label."""
        raw = "EquipoCalidad: High"
        expected = "Equipo\nCalidad: High"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_formatos(self):
        """TRIANGULATE: 'VentaFormatos:' → newline before label."""
        raw = "VentaFormatos: Bottle, Can"
        expected = "Venta\nFormatos: Bottle, Can"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_canal(self):
        """TRIANGULATE: 'VentaCanal:' → newline before label."""
        raw = "VentaCanal: Direct"
        expected = "Venta\nCanal: Direct"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_lupulos(self):
        """TRIANGULATE: 'UsaLúpulos:' → newline before label."""
        raw = "UsaLúpulos: Cascade"
        expected = "Usa\nLúpulos: Cascade"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_malta(self):
        """TRIANGULATE: 'UsaMalta:' → newline before label."""
        raw = "UsaMalta: Pilsner"
        expected = "Usa\nMalta: Pilsner"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_levadura(self):
        """TRIANGULATE: 'UsaLevadura:' → newline before label."""
        raw = "UsaLevadura: US-05"
        expected = "Usa\nLevadura: US-05"
        assert normalize_response_text(raw) == expected

    def test_separates_glued_label_contacto(self):
        """TRIANGULATE: 'InfoContacto:' → newline before label."""
        raw = "InfoContacto: Juan Pérez"
        expected = "Info\nContacto: Juan Pérez"
        assert normalize_response_text(raw) == expected

    def test_does_not_separate_when_space_already_present(self):
        """TRIANGULATE: 'Nombre: Test' stays unchanged."""
        raw = "Nombre: Test Brewery"
        assert normalize_response_text(raw) == raw

    def test_does_not_separate_mid_word_label(self):
        """EDGE: 'Anonymous' contains 'Nom' but is not a label boundary."""
        raw = "Anonymous brewer"
        assert normalize_response_text(raw) == raw

    def test_does_not_separate_url_with_colon(self):
        """EDGE: URLs with colons must stay intact."""
        raw = "Visit https://example.com:8080/path"
        assert normalize_response_text(raw) == raw

    def test_does_not_separate_time_notation(self):
        """EDGE: Time notation '12:30' stays intact."""
        raw = "Meeting at 12:30"
        assert normalize_response_text(raw) == raw

    def test_separates_multiple_glued_labels_in_one_text(self):
        """INTEGRATION: Multiple glued labels all get separated."""
        raw = "Brew ACiudad: BogotáPaís: Colombia"
        expected = "Brew A\nCiudad: Bogotá\nPaís: Colombia"
        assert normalize_response_text(raw) == expected

    # --- Spanish punctuation spacing ---

    def test_adds_space_before_inverted_question_mark(self):
        """RED: 'ninguna¿Necesitas...' → space before ¿."""
        raw = "ninguna¿Necesitas algo más?"
        expected = "ninguna ¿Necesitas algo más?"
        assert normalize_response_text(raw) == expected

    def test_adds_space_before_inverted_question_mark_after_number(self):
        """TRIANGULATE: '42¿Cuántas?' → space before ¿."""
        raw = "42¿Cuántas cervecerías?"
        expected = "42 ¿Cuántas cervecerías?"
        assert normalize_response_text(raw) == expected

    def test_adds_space_before_inverted_exclamation_mark(self):
        """TRIANGULATE: 'hola¡Qué tal!' → space before ¡."""
        raw = "hola¡Qué tal!"
        expected = "hola ¡Qué tal!"
        assert normalize_response_text(raw) == expected

    def test_does_not_add_space_when_space_already_before_question_mark(self):
        """EDGE: 'ninguna ¿Necesitas?' stays unchanged."""
        raw = "ninguna ¿Necesitas algo?"
        assert normalize_response_text(raw) == raw

    def test_does_not_add_space_at_start_of_string(self):
        """EDGE: '¿Necesitas algo?' stays unchanged."""
        raw = "¿Necesitas algo?"
        assert normalize_response_text(raw) == raw

    # --- Sentence punctuation spacing ---

    def test_adds_space_after_period_followed_by_uppercase(self):
        """RED: 'Hola.Mundo' → 'Hola. Mundo'."""
        raw = "Hola.Mundo"
        expected = "Hola. Mundo"
        assert normalize_response_text(raw) == expected

    def test_adds_space_after_comma_followed_by_letter(self):
        """TRIANGULATE: 'Bogotá,Medellín' → 'Bogotá, Medellín'."""
        raw = "Bogotá,Medellín"
        expected = "Bogotá, Medellín"
        assert normalize_response_text(raw) == expected

    def test_adds_space_after_semicolon_followed_by_letter(self):
        """TRIANGULATE: 'uno;dos' → 'uno; dos'."""
        raw = "uno;dos"
        expected = "uno; dos"
        assert normalize_response_text(raw) == expected

    def test_adds_space_after_colon_followed_by_letter(self):
        """TRIANGULATE: 'Nota:más info' → 'Nota: más info'."""
        raw = "Nota:más info"
        expected = "Nota: más info"
        assert normalize_response_text(raw) == expected

    def test_adds_space_after_exclamation_followed_by_uppercase(self):
        """TRIANGULATE: 'Hola!Mundo' → 'Hola! Mundo'."""
        raw = "Hola!Mundo"
        expected = "Hola! Mundo"
        assert normalize_response_text(raw) == expected

    def test_adds_space_after_question_followed_by_uppercase(self):
        """TRIANGULATE: 'Hola?Mundo' → 'Hola? Mundo'."""
        raw = "Hola?Mundo"
        expected = "Hola? Mundo"
        assert normalize_response_text(raw) == expected

    def test_does_not_add_space_after_decimal_point(self):
        """EDGE: '3.14' stays unchanged."""
        raw = "Production is 3.14 liters"
        assert normalize_response_text(raw) == raw

    def test_does_not_add_space_in_email(self):
        """EDGE: 'user@example.com' stays unchanged."""
        raw = "Email:user@example.com"
        expected = "Email: user@example.com"
        # Only the colon gets space, email stays intact
        assert normalize_response_text(raw) == expected

    def test_does_not_add_space_in_url(self):
        """EDGE: 'https://example.com' stays unchanged."""
        raw = "Visit https://example.com for more"
        assert normalize_response_text(raw) == raw

    def test_does_not_add_space_after_abbreviation_eg(self):
        """EDGE: 'e.g.something' — actually this should get space."""
        # e.g. is tricky; we accept conservative behavior here
        raw = "Use e.g. hops"
        assert normalize_response_text(raw) == raw

    def test_does_not_add_space_when_space_already_present(self):
        """EDGE: 'Hola. Mundo' stays unchanged."""
        raw = "Hola. Mundo"
        assert normalize_response_text(raw) == raw

    # --- Combined / integration ---

    def test_full_brewery_record_glued_formatting(self):
        """INTEGRATION: Typical glued brewery response gets fully normalized."""
        raw = (
            "Cerveceria 2Nombre: Brew TestCiudad: BogotáPaís: Colombia"
            "¿Necesitas algo más?"
        )
        expected = (
            "Cerveceria 2\nNombre: Brew Test\nCiudad: Bogotá\nPaís: Colombia"
            " ¿Necesitas algo más?"
        )
        assert normalize_response_text(raw) == expected

    def test_multiple_records_with_glued_labels(self):
        """INTEGRATION: Multiple brewery records with glued labels."""
        raw = (
            "1. Nombre: Brew ACiudad: Bogotá\n"
            "2. Nombre: Brew BCiudad: Medellín"
        )
        expected = (
            "1. Nombre: Brew A\nCiudad: Bogotá\n"
            "2. Nombre: Brew B\nCiudad: Medellín"
        )
        assert normalize_response_text(raw) == expected

    def test_preserves_already_clean_text(self):
        """EDGE: Clean text stays unchanged."""
        raw = (
            "Nombre: Brew Test\n"
            "Ciudad: Bogotá\n"
            "País: Colombia\n\n"
            "¿Necesitas algo más?"
        )
        assert normalize_response_text(raw) == raw

    def test_empty_string(self):
        """EDGE: Empty string returns empty string."""
        assert normalize_response_text("") == ""

    def test_single_word(self):
        """EDGE: Single word stays unchanged."""
        assert normalize_response_text("Hola") == "Hola"

    def test_no_false_positives_on_common_words(self):
        """EDGE: Common words that end like labels don't get split."""
        raw = "The phone number is 3115551234"
        assert normalize_response_text(raw) == raw

    def test_handles_unicode_accents_in_labels(self):
        """EDGE: Labels with accents are recognized."""
        raw = "DataPaís: Colombia"
        expected = "Data\nPaís: Colombia"
        assert normalize_response_text(raw) == expected

    def test_handles_unicode_accents_in_punctuation_context(self):
        """EDGE: Accented words around punctuation."""
        raw = "Bogotá,Medellín,Cali"
        expected = "Bogotá, Medellín, Cali"
        assert normalize_response_text(raw) == expected
