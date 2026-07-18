"""Business logic service for wine producer operations."""

from uuid import UUID

from fastapi.encoders import jsonable_encoder

from app.schemas.wine_producers import WineProducerCreate, WineProducerUpdate
from app.services.entity_contact_phone_service import EntityContactPhoneService


class WineProducerService:
    """Service layer for wine producer CRUD operations using Supabase."""

    _ENTITY_TYPE = "wine_producer"

    def __init__(
        self,
        supabase_client,
        phone_service: EntityContactPhoneService,
    ) -> None:
        self.supabase = supabase_client
        self.phone_service = phone_service

    def _exclude_phones(self, payload: WineProducerCreate | WineProducerUpdate) -> dict:
        """Dump payload excluding the virtual ``phones`` field."""
        return jsonable_encoder(
            payload.model_dump(
                exclude_unset=True,
                exclude_none=True,
                exclude={"phones"},
            )
        )

    def _merge_phones(self, record: dict | None, entity_id: UUID) -> dict | None:
        """Attach ordered phones from the shared phone store to a record."""
        if record is None:
            return None
        record["phones"] = self.phone_service.get_phones(self._ENTITY_TYPE, entity_id)
        return record

    def create(self, payload: WineProducerCreate) -> dict:
        """Create a new wine producer in Supabase and persist its phones."""
        data = self._exclude_phones(payload)
        response = self.supabase.table("wine_producers").insert(data).execute()
        record = response.data[0] if response.data else {}
        if record:
            producer_id = UUID(record["id"])
            self.phone_service.replace_phones(self._ENTITY_TYPE, producer_id, payload.phones)
            record = self._merge_phones(record, producer_id)
        return record

    def list_all(self) -> list[dict]:
        """List all wine producers from Supabase with their ordered phones."""
        response = self.supabase.table("wine_producers").select("*").execute()
        records = response.data or []
        if not records:
            return records

        ids = [UUID(record["id"]) for record in records]
        phones_by_id = self.phone_service.batch_load_phones(self._ENTITY_TYPE, ids)
        for record in records:
            record["phones"] = phones_by_id.get(UUID(record["id"]), [])
        return records

    def get_by_id(self, producer_id: UUID) -> dict | None:
        """Get a single wine producer by ID with its ordered phones."""
        response = (
            self.supabase.table("wine_producers")
            .select("*")
            .eq("id", str(producer_id))
            .execute()
        )
        record = response.data[0] if response.data else None
        return self._merge_phones(record, producer_id)

    def update(self, producer_id: UUID, payload: WineProducerUpdate) -> dict | None:
        """Update an existing wine producer and replace its phones."""
        data = self._exclude_phones(payload)
        if data:
            response = (
                self.supabase.table("wine_producers")
                .update(data)
                .eq("id", str(producer_id))
                .execute()
            )
            record = response.data[0] if response.data else None
        else:
            record = self.get_by_id(producer_id)

        if record is not None:
            self.phone_service.replace_phones(self._ENTITY_TYPE, producer_id, payload.phones)
            record = self._merge_phones(record, producer_id)
        return record

    def delete(self, producer_id: UUID) -> bool:
        """Delete a wine producer by ID.

        Phone cleanup is handled by the database AFTER DELETE trigger; the
        service does not call the phone service here.
        """
        response = (
            self.supabase.table("wine_producers")
            .delete()
            .eq("id", str(producer_id))
            .execute()
        )
        return bool(response.data)
