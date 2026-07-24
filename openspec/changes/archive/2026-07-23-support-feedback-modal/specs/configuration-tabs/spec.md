# Delta for configuration-tabs

## ADDED Requirements

### Requirement: ConfigPage renders FeedbackModal when feedback is open

The ConfigPage MUST render `<FeedbackModal>` consuming `isFeedbackOpen` from local state. The modal MUST receive `isOpen={isFeedbackOpen}`, `onClose={() => setIsFeedbackOpen(false)}`, and a stub `onSubmit` callback (real API deferred to CORTEXDIST-27).

#### Scenario: FeedbackModal opens when isFeedbackOpen is true

- GIVEN the "Ayuda y soporte" button sets `isFeedbackOpen` to `true`
- WHEN ConfigPage re-renders
- THEN `<FeedbackModal>` is rendered with `isOpen={true}`

#### Scenario: FeedbackModal close resets feedback state

<!-- Wording correction (2026-07-23): the previous wording required the modal to "unmount".
     That contradicted the approved design decision "Persistent isOpen consumer" (design.md),
     which deliberately follows the house pattern of an always-mounted native <dialog> driven
     by isOpen (same as EntityFormModal). The scenario now asserts the OBSERVABLE contract
     instead of the implementation detail. Implementation unchanged. -->

- GIVEN FeedbackModal is open in ConfigPage
- WHEN the modal calls `onClose`
- THEN `isFeedbackOpen` transitions to `false`, no accessible dialog is exposed (a dialog role query finds none), AND internal form state is reset so the next open presents a fresh idle form
