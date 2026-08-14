# Autonomy

An authority candidate is only a proposal. Fifteen approved, verified interactions can create evidence for a scoped proposal; a separate explicit user approval creates the autonomous grant.

Interaction learning records only truthful user decisions from the control boundary. AES does not infer approval merely because an assisted action completed. Evidence is matched by action type and normalized applicability, then stored in project-local interaction history.

The runtime can also remember a recent rejection of an optional proposal and suppress an equivalent repeated prompt for a bounded number of runs. Suppression is scoped and expires when the run window ends or the applicability context changes. Hard blockers and mandatory safety or authority prompts cannot be suppressed.

If an autonomous action later regresses, AES may degrade its scoped authority back to `assisted`. It never automatically promotes that authority again. A project-specific candidate cannot silently become a user-global grant.
