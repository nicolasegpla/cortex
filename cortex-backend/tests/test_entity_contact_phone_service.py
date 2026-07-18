"""Unit tests for EntityContactPhoneService."""

from uuid import UUID, uuid4
from unittest.mock import MagicMock

import pytest

from app.services.entity_contact_phone_service import EntityContactPhoneService


class TestEntityContactPhoneService:
    """Test shared phone service with mocked Supabase client."""

    @pytest.fixture
    def mock_supabase(self):
        """Create a mocked Supabase PostgREST-style client."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_supabase):
        """Create a phone service with mocked client."""
        return EntityContactPhoneService(mock_supabase)

    # --- normalize ---

    def test_normalize_trims_whitespace(self, service):
        result = service.normalize(["  300  ", "  301"])
        assert result == ["300", "301"]

    def test_normalize_drops_blank_and_whitespace_only_entries(self, service):
        result = service.normalize(["  300  ", "", "   ", "301"])
        assert result == ["300", "301"]

    def test_normalize_deduplicates_preserving_first_occurrence(self, service):
        result = service.normalize(["300", "301", "300", "302", "301"])
        assert result == ["300", "301", "302"]

    def test_normalize_returns_empty_list_for_empty_input(self, service):
        result = service.normalize([])
        assert result == []

    def test_normalize_returns_empty_list_when_all_blank(self, service):
        result = service.normalize(["", "   ", "\t"])
        assert result == []

    # --- get_phones ---

    def test_get_phones_returns_ordered_phones(self, service, mock_supabase):
        entity_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = [
            {"phone": "301", "sort_order": 1},
            {"phone": "300", "sort_order": 2},
        ]

        result = service.get_phones("brewery", entity_id)

        assert result == ["301", "300"]
        mock_supabase.table.assert_called_once_with("entity_contact_phones")
        mock_supabase.table.return_value.select.assert_called_once_with("phone, sort_order")
        mock_supabase.table.return_value.select.return_value.eq.assert_any_call("entity_type", "brewery")
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.assert_any_call("entity_id", str(entity_id))
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.assert_called_once_with("sort_order", desc=False)

    def test_get_phones_returns_empty_list_when_none(self, service, mock_supabase):
        entity_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = []

        result = service.get_phones("brewery", entity_id)

        assert result == []

    # --- batch_load_phones ---

    def test_batch_load_phones_returns_dict_grouped_by_entity_id(self, service, mock_supabase):
        id_1 = uuid4()
        id_2 = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
            {"entity_id": str(id_1), "phone": "300", "sort_order": 1},
            {"entity_id": str(id_1), "phone": "301", "sort_order": 2},
            {"entity_id": str(id_2), "phone": "310", "sort_order": 1},
        ]

        result = service.batch_load_phones("brewery", [id_1, id_2])

        assert result == {id_1: ["300", "301"], id_2: ["310"]}
        mock_supabase.table.assert_called_once_with("entity_contact_phones")
        mock_supabase.table.return_value.select.assert_called_once_with("entity_id, phone, sort_order")
        mock_supabase.table.return_value.select.return_value.eq.assert_called_once_with("entity_type", "brewery")
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.assert_called_once_with("entity_id", [str(id_1), str(id_2)])

    def test_batch_load_phones_returns_empty_list_for_missing_ids(self, service, mock_supabase):
        entity_id = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = []

        result = service.batch_load_phones("brewery", [entity_id])

        assert result == {entity_id: []}

    # --- replace_phones ---

    def test_replace_phones_deletes_existing_then_inserts_ordered(self, service, mock_supabase):
        entity_id = uuid4()
        phones = ["300", "301"]
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = []

        service.replace_phones("brewery", entity_id, phones)

        mock_supabase.table.assert_any_call("entity_contact_phones")
        mock_supabase.table.return_value.delete.assert_called_once()
        mock_supabase.table.return_value.delete.return_value.eq.assert_any_call("entity_type", "brewery")
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.assert_any_call("entity_id", str(entity_id))
        mock_supabase.table.return_value.insert.assert_called_once_with([
            {"entity_type": "brewery", "entity_id": str(entity_id), "phone": "300", "sort_order": 1},
            {"entity_type": "brewery", "entity_id": str(entity_id), "phone": "301", "sort_order": 2},
        ])

    def test_replace_phones_with_empty_list_deletes_only(self, service, mock_supabase):
        entity_id = uuid4()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

        service.replace_phones("brewery", entity_id, [])

        mock_supabase.table.return_value.delete.assert_called_once()
        mock_supabase.table.return_value.insert.assert_not_called()

    # --- find_entity_ids_by_phone ---

    def test_find_entity_ids_by_phone_returns_matching_entity_ids(self, service, mock_supabase):
        id_1 = uuid4()
        id_2 = uuid4()
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"entity_id": str(id_1)},
            {"entity_id": str(id_2)},
        ]

        result = service.find_entity_ids_by_phone("brewery", "300")

        assert result == [id_1, id_2]
        mock_supabase.table.assert_called_once_with("entity_contact_phones")
        mock_supabase.table.return_value.select.assert_called_once_with("entity_id")
        mock_supabase.table.return_value.select.return_value.eq.assert_any_call("entity_type", "brewery")
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.assert_any_call("phone", "300")

    def test_find_entity_ids_by_phone_returns_empty_when_no_match(self, service, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

        result = service.find_entity_ids_by_phone("brewery", "300")

        assert result == []

    # --- entity type validation ---

    def test_invalid_entity_type_raises_value_error(self, service):
        with pytest.raises(ValueError, match="Invalid entity_type"):
            service.get_phones("invalid_type", uuid4())
