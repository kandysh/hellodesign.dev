# Nonblocking follow-up evaluations

## Goal

Stop holding an evaluation worker while a candidate answers a clarification question. Preserve the current quick/deep evaluation behavior, including accepting one reply per follow-up and proceeding with available information after the existing five-minute timeout.

## Current behavior and root cause

`runClarificationPhase` in `packages/ai/src/graph.ts` reaches `waitReplyNode`, publishes a follow-up, then awaits `waitForReply`. `apps/worker/src/processors/eval.ts` implements that callback with a Redis subscription and a five-minute timer. While it waits, BullMQ considers the evaluation job active and counts it against the queue's worker concurrency.

The API currently stores the reply as an `AgentMessage` and publishes it through Redis. The worker has no durable copy of the LangGraph conversation state: the graph messages, tool-call IDs, risk count, and current follow-up round are only in process memory. `Submission` has no checkpoint or timeout timestamp, and continuation jobs are not scheduled.

## Requirements

1. A job must finish and release its worker slot as soon as it has asked for a candidate reply.
2. A follow-up must resume with the exact preceding AI/tool conversation, including each pending tool-call ID, round count, risk count, and evaluation configuration.
3. A reply or timeout must be accepted at most once for each follow-up round.
4. A reply accepted by the API must eventually be queued, even if API or worker processes restart between the database write and the Redis queue write.
5. The current five-minute timeout behavior remains: if no reply arrives, the evaluation resumes with an explicit no-reply tool result.
6. Quick mode continues to skip follow-ups; deep mode keeps its existing rubric quota.
7. The WebSocket/REST reply payload and client-visible `FOLLOWUP` status remain compatible.
8. Deleting a submission/account/guest session removes checkpoints and pending continuation records through database cascades and queue cleanup.

## Proposed design

### Durable graph checkpoint

Add nullable, server-only clarification checkpoint state, a follow-up deadline, and an active follow-up round number to `Submission`. The checkpoint is versioned JSON and stores the evaluation configuration (`agentType`, `mood`, and selected model), serialized LangChain messages, follow-up and risk counts, current round, pending reply-tool call IDs, and the prompt version. The active round number is also a relational column so reply and timeout transactions can compare-and-set it without depending on JSON query behavior. The question and owner remain available from the submission row; the provider key is resolved again from its owner record. Do not return this checkpoint from submission or message APIs.

Use an explicit message codec with round-trip tests rather than relying on an opaque in-memory graph object. It must preserve `AIMessage.tool_calls` and `ToolMessage.tool_call_id` exactly. Keep user-visible messages in `AgentMessage`; the checkpoint is execution state, not a replacement for the transcript.

Change `runClarificationPhase` to return a discriminated result: either completed messages and counters, or a waiting result containing the checkpoint and follow-up question. The graph publishes the follow-up request and exits instead of awaiting a reply. On continuation, restore the checkpoint, add a `ToolMessage` for each pending reply call and the candidate's `HumanMessage` when present, then continue the graph from the stored counters.

### Continuation outbox and queue dispatch

Add a PostgreSQL continuation outbox row keyed uniquely by submission and follow-up round. It records the resume reason (`reply` or `timeout`), the persisted reply message ID when applicable, the deterministic BullMQ job ID, `dispatchedAt`, separate dispatcher and worker lease owner/expiry fields, and `completedAt`. The outbox is the durable handoff between PostgreSQL and BullMQ. A BullMQ job carrying the exact outbox ID may claim an incomplete row when no worker lease exists or the lease expired, even if the dispatcher has not yet recorded `dispatchedAt`; receiving that job proves `queue.add` succeeded. In the same transaction, it claims the lease and changes the submission from `PENDING` to `PROCESSING`, or reclaims a `PROCESSING` submission only when that row's prior worker lease expired. Renew the worker lease while the job runs. A duplicate job that sees a live lease or a completed outbox row exits without running the graph.

When an initial evaluation reaches a follow-up, the worker transactionally saves the checkpoint, deadline, visible follow-up message, and `FOLLOWUP` status. It then publishes the follow-up event and returns from the BullMQ processor, releasing the slot. Completing this stage must not release the owner's pending-evaluation reservation; release it only after a terminal result, final failure, or deletion.

When a REST or WebSocket reply arrives, read the active round and then use one PostgreSQL transaction to compare-and-set both `status = FOLLOWUP` and that exact active round to `PENDING`, persist the user message, and create the unique continuation outbox row. The reply route must not accept a client-supplied round as authority. If the round was already answered or timed out, return the existing conflict response. The expiry sweep uses the same compare-and-set and inserts a `timeout` outbox row only if the deadline has passed and that same round is still active. Thus reply and timeout serialize on the submission row and exactly one transaction wins; if any insert fails, the status change rolls back too.

A dispatcher in the worker service periodically scans undispatched outbox rows, leases rows whose dispatcher lease is absent or expired, adds continuation jobs to the existing quick/deep queue selected for that evaluation, and marks rows dispatched. Use the outbox row ID as the deterministic BullMQ job ID. If the dispatcher crashes after `queue.add` but before setting `dispatchedAt`, it can safely enqueue again: BullMQ deduplicates the retained job ID, and the PostgreSQL worker lease plus status compare-and-set prevents duplicate graph execution even if a duplicate delivery occurs later. Retain completed BullMQ jobs until their outbox rows are marked dispatched and completed. Reclaim expired dispatcher leases and worker processing leases after crashes. This periodic scan makes persisted replies recoverable after API or worker restarts.

An expiry sweep creates the same outbox row with reason `timeout` when the deadline passes and the submission is still `FOLLOWUP`. Reply acceptance and expiry use the same compare-and-set transaction, so only one wins. The timeout continuation adds the existing no-reply `ToolMessage` and continues evaluation. If a checkpoint version is unsupported, the owner key is missing, or a continuation exhausts normal BullMQ retries, transition the submission to `FAILED`, clear its checkpoint, and release its pending-evaluation reservation once. A deletion that races with a continuation cancels queued work; the worker checks that the submission still exists before committing a stage.

### Continuation processing and state transitions

Initial and continuation jobs share the existing quick/deep queue concurrency limits, selected from the checkpoint's `agentType`. A continuation loads its outbox row and checkpoint, claims that round under the outbox lease, and resumes clarification. It adds the saved candidate `AgentMessage` to the graph exactly once, keyed by its database ID; timeout adds the no-reply result without a candidate message. If the graph asks another question, atomically save the next checkpoint, active round, deadline, visible follow-up message, and `FOLLOWUP` status, and complete the current outbox row. Otherwise clear the checkpoint, complete the outbox row, and continue through scoring, narrative feedback, and result persistence. Terminal result creation and pending-evaluation reservation release must also be idempotent under a worker retry.

Keep the sequence of user-visible follow-up and reply messages stable and idempotent across BullMQ retries. Give each persisted agent turn a stable sequence key and upsert by `(submissionId, sequence)` (or use stable IDs allocated before the turn is committed); never append the same follow-up or reply twice. A retry of the same stage starts from the last committed checkpoint and reuses its IDs; it must not delete the transcript or replay completed follow-up rounds. Commit graph output and the next checkpoint/status transition together so a retry cannot observe a half-written stage. Final failures set `FAILED` and release the owner's pending-evaluation reservation exactly once. Completion and deletion must clear checkpoint/outbox state and release the reservation.

Publish `followup`, `user_reply`, progress, and terminal events through the existing Redis event buffer only after the corresponding database transition commits. Include a stable event ID derived from the submission, stage/round, and event sequence so clients can ignore duplicate delivery after worker retries. Treat events as notifications: on reconnect, the existing API status/messages reads remain the source of truth if an event is delayed or lost.

## Operational rollout

Use an additive database migration. Before deploying the new worker behavior, drain or allow old active evaluation jobs and old in-memory follow-up waits to finish; old jobs cannot be converted into checkpoints after restart. Deploy the API and worker versions together, then verify the dispatcher and expiry sweep are active. The checkpoint format is versioned so a future worker can reject or migrate an unsupported version clearly rather than interpreting it silently.

## Verification plan

1. **AI unit/integration:** the graph returns a waiting checkpoint without calling `waitForReply`; message codec round-trips assistant tool calls; resuming inserts matching tool results and the candidate response; a second follow-up preserves counters; timeout resumes with the no-reply result.
2. **API/PostgreSQL integration:** reply acceptance atomically persists a message and one outbox row; duplicate replies and reply/timeout races create exactly one continuation; account/guest deletion cascades to checkpoint/outbox.
3. **Worker/Redis/PostgreSQL integration:** the first job completes in `FOLLOWUP` with no active worker; the dispatcher queues one continuation; the resumed evaluation reaches `DONE`; dispatcher crash windows and worker retries do not duplicate persisted messages or scores, and clients ignore duplicate event IDs.
4. **End-to-end:** exercise deep submit, WebSocket follow-up, reply, continuation, and terminal WebSocket event, plus the timeout path.
5. **Load:** run 20 simultaneous deep evaluations that wait for replies; while all are waiting, submit and complete additional evaluations. Verify waiting jobs do not consume active worker slots and that reply/timeout continuations complete without loss or duplication.

## Alternatives considered

- **LangGraph Postgres checkpointer and interrupts:** more native to LangGraph, but adds a new checkpoint package/schema and couples the application workflow more tightly to its checkpoint API. The application still needs transactional reply-to-queue delivery and timeout handling.
- **Delayed BullMQ jobs:** avoids a new database checkpoint but leaves workflow state in Redis job data and requires careful handling when a reply arrives while the job is transitioning from active to delayed. This is weaker for recovery and makes the existing reply race harder to reason about.
- **Chosen: PostgreSQL checkpoint plus continuation outbox:** keeps workflow state durable with the submission and makes reply acceptance atomic with scheduling intent. The outbox handles PostgreSQL/Redis dual-write failures; the worker only runs while making progress.
