"""Shared service for entity contact phone numbers."""

from uuid import UUID


class EntityContactPhoneService:
    """Manage contact phone numbers stored in ``public.entity_contact_phones``.

    The service is generic over the four supported entity types and operates on
    a single Supabase/PostgREST client. Phone normalization is centralized
    here so every entity follows the same trim, blank-drop and deduplication
    rules.
    """

    TABLE = "entity_contact_phones"
    ENTITY_TYPES = ("brewery", "coffee_farm", "animal_feed_producer", "wine_producer")

    def __init__(self, supabase_client) -> None:
        self.supabase = supabase_client

    @staticmethod
    def normalize(phones: list[str]) -> list[str]:
        """Trim each phone, drop blanks and deduplicate preserving first occurrence.

        Args:
            phones: Raw phone strings from an API payload.

        Returns:
            list[str]: Cleaned phone numbers in input order with duplicates removed.
        """
        seen: set[str] = set()
        result: list[str] = []
        for phone in phones:
            cleaned = phone.strip()
            if not cleaned:
                continue
            if cleaned in seen:
                continue
            seen.add(cleaned)
            result.append(cleaned)
        return result

    def _validate_entity_type(self, entity_type: str) -> None:
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity_type: {entity_type}")

    def get_phones(self, entity_type: str, entity_id: UUID) -> list[str]:
        """Return ordered phone numbers for a single entity.

        Args:
            entity_type: One of the supported entity type constants.
            entity_id: UUID of the entity.

        Returns:
            list[str]: Phone numbers ordered by ``sort_order``.
        """
        self._validate_entity_type(entity_type)
        response = (
            self.supabase.table(self.TABLE)
            .select("phone, sort_order")
            .eq("entity_type", entity_type)
            .eq("entity_id", str(entity_id))
            .order("sort_order", desc=False)
            .execute()
        )
        rows = response.data or []
        return [row["phone"] for row in rows]

    def batch_load_phones(self, entity_type: str, entity_ids: list[UUID]) -> dict[UUID, list[str]]:
        """Load phones for many entities in a single query.

        Args:
            entity_type: One of the supported entity type constants.
            entity_ids: List of entity UUIDs.

        Returns:
            dict[UUID, list[str]]: Mapping from entity ID to ordered phones.
            Missing IDs map to an empty list.
        """
        self._validate_entity_type(entity_type)
        if not entity_ids:
            return {}

        str_ids = [str(entity_id) for entity_id in entity_ids]
        response = (
            self.supabase.table(self.TABLE)
            .select("entity_id, phone, sort_order")
            .eq("entity_type", entity_type)
            .in_("entity_id", str_ids)
            .execute()
        )
        rows = response.data or []

        grouped: dict[UUID, list[str]] = {entity_id: [] for entity_id in entity_ids}
        for row in sorted(rows, key=lambda row: (row["entity_id"], row["sort_order"])):
            grouped[UUID(row["entity_id"])].append(row["phone"])
        return grouped

    def replace_phones(self, entity_type: str, entity_id: UUID, phones: list[str]) -> None:
        """Delete all existing phones for an entity and insert normalized ones.

        Args:
            entity_type: One of the supported entity type constants.
            entity_id: UUID of the entity.
            phones: Raw phone strings; they are normalized before persistence.
        """
        self._validate_entity_type(entity_type)
        (
            self.supabase.table(self.TABLE)
            .delete()
            .eq("entity_type", entity_type)
            .eq("entity_id", str(entity_id))
            .execute()
        )
        normalized = self.normalize(phones)
        if not normalized:
            return

        rows = [
            {
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "phone": phone,
                "sort_order": index + 1,
            }
            for index, phone in enumerate(normalized)
        ]
        self.supabase.table(self.TABLE).insert(rows).execute()

    def find_entity_ids_by_phone(self, entity_type: str, phone: str) -> list[UUID]:
        """Return entity IDs whose stored phone matches exactly.

        Args:
            entity_type: One of the supported entity type constants.
            phone: Phone string to match (normalized by the caller if needed).

        Returns:
            list[UUID]: Entity IDs with the given phone, deduplicated by query order.
        """
        self._validate_entity_type(entity_type)
        response = (
            self.supabase.table(self.TABLE)
            .select("entity_id")
            .eq("entity_type", entity_type)
            .eq("phone", phone)
            .execute()
        )
        rows = response.data or []
        return [UUID(row["entity_id"]) for row in rows]
