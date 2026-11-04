import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import "../styles/global.css";
import "../styles/Meetups.css";

const fmt = (value) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const messageOf = (data, fallback) => data?.detail || data?.message || fallback;

function Meetups() {
    const [meetups, setMeetups] = useState([]);
    const [sports, setSports] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [search, setSearch] = useState("");
    const [sportId, setSportId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [detail, setDetail] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showInvitations, setShowInvitations] = useState(false);
    const [busy, setBusy] = useState(false);
    const [connections, setConnections] = useState([]);
    const [inviteeId, setInviteeId] = useState("");
    const [modalFeedback, setModalFeedback] = useState("");
    const [inviteFeedback, setInviteFeedback] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [editDateTime, setEditDateTime] = useState("");
    const [editDuration, setEditDuration] = useState("60");
    const [pendingConfirmations, setPendingConfirmations] = useState([]);
    const [showConfirmations, setShowConfirmations] = useState(false);
    const [votingMeetupId, setVotingMeetupId] = useState(null);

    const loadMeetups = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set("search", search.trim());
            if (sportId) params.set("sport_id", sportId);
            params.set("limit", "50");
            const response = await apiFetch(`meetups?${params}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(messageOf(data, "Unable to load meetups."));
            setMeetups(Array.isArray(data) ? data : data.meetups ?? []);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, [search, sportId]);

    const loadInvitations = useCallback(async () => {
        const response = await apiFetch("meetups/invitations");
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(messageOf(data, "Unable to load invitations."));
        setInvitations(Array.isArray(data) ? data : data.invitations ?? []);
    }, []);

    const loadConfirmations = useCallback(async () => {
        const response = await apiFetch("meetups/pending-confirmation");

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                messageOf(data, "Unable to load confirmations.")
            );
        }

        setPendingConfirmations(
            Array.isArray(data)
                ? data
                : data.meetups ?? []
        );
    }, []);

    useEffect(() => {
        const timer = setTimeout(loadMeetups, 250);
        return () => clearTimeout(timer);
    }, [loadMeetups]);

    useEffect(() => {
        apiFetch("sports/").then(async r => {
            if (!r.ok) throw new Error("Could not load sports.");
            const d = await r.json(); setSports(d.sports ?? []);
        }).catch(e => setError(e.message));
        loadInvitations().catch(() => { });
    }, [loadInvitations]);

    async function openDetails(id) {
        setError(""); setNotice(""); setModalFeedback(""); setInviteFeedback(""); setBusy(true);
        try {
            const r = await apiFetch(`meetups/${id}`); const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(messageOf(d, "Unable to load meetup details."));
            setDetail(d);
            setInviteeId("");
            if (d.is_host) {
                const cr = await apiFetch("connections?sort=alphabetical");
                const cd = await cr.json().catch(() => ({}));
                if (cr.ok) setConnections(cd.connections ?? []);
            }
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }

    async function act(endpoint, method, success) {
        if (busy) return;
        setBusy(true); setError(""); setNotice("");
        try {
            const r = await apiFetch(endpoint, { method });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(messageOf(d, "Action failed."));
            setNotice(success);
            await loadMeetups();
            if (detail) await openDetails(detail.id);
        } catch (e) { setModalFeedback(e.message); }
        finally { setBusy(false); }
    }

    async function respondInvitation(inv, decision) {
        setBusy(true); setError("");
        try {
            const r = await apiFetch(`meetups/invitations/${inv.invitation_id}/${decision}`, { method: "POST" });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(messageOf(d, "Could not process invitation."));
            setNotice(decision === "accept" ? "Invitation accepted. You're registered." : "Invitation declined.");
            await Promise.all([loadInvitations(), loadMeetups()]);
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }

    async function submitConfirmation(meetupId, outcome) {
        if (votingMeetupId !== null) return;

        setVotingMeetupId(meetupId);
        setError("");
        setNotice("");

        try {
            const response = await apiFetch(
                `meetups/${meetupId}/outcome`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        outcome
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    messageOf(data, "Unable to submit confirmation.")
                );
            }

            setNotice(
                data.finalized
                    ? "Confirmation submitted. The meetup has been finalized."
                    : "Your confirmation has been submitted."
            );

            await loadConfirmations();
            await loadMeetups();

        } catch (e) {
            setError(e.message);
        } finally {
            setVotingMeetupId(null);
        }
    }

    async function actInvite(meetupId, inviteeIdValue) {
        if (busy) return; setBusy(true); setInviteFeedback("");
        try {
            const r = await apiFetch(`meetups/${meetupId}/invitations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitee_id: inviteeIdValue }) });
            const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(messageOf(d, "Could not send invitation."));
            setNotice("Invitation sent."); setInviteeId(""); setInviteFeedback("");
        } catch (e) { setInviteFeedback(e.message) } finally { setBusy(false) }
    }
    async function removePlayer(meetupId, userId, name) {
        if (!window.confirm(`Remove ${name} from this meetup?`)) return;
        await act(`meetups/${meetupId}/participants/${userId}`, "DELETE", `${name} removed from the meetup.`);
    }
    async function cancelMeetup(meetupId) {
        if (!window.confirm("Delete this meetup? This cannot be undone.")) return;
        if (busy) return; setBusy(true); setError("");
        try { const r = await apiFetch(`meetups/${meetupId}`, { method: "DELETE" }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(messageOf(d, "Could not cancel meetup.")); setDetail(null); setNotice("Meetup cancelled."); await loadMeetups(); }
        catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    function startEditMeetup(m) {
        const initial = new Date(m.meetup_time);
        const local = new Date(initial.getTime() - initial.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setEditDateTime(local);
        setEditDuration(String(m.duration_minutes));
        setModalFeedback("");
        setEditMode(true);
    }

    async function saveMeetupEdit(event) {
        event.preventDefault();
        if (!detail || busy) return;
        const minutes = Number(editDuration);
        if (!editDateTime || new Date(editDateTime).getTime() <= Date.now()) { setModalFeedback("Choose a future date and time."); return; }
        if (!Number.isInteger(minutes) || minutes < 15 || minutes > 720) { setModalFeedback("Duration must be between 15 and 720 minutes."); return; }
        setBusy(true); setModalFeedback("");
        try {
            const r = await apiFetch(`meetups/${detail.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetup_time: new Date(editDateTime).toISOString(), duration_minutes: minutes }) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(messageOf(d, "Could not update meetup."));
            setEditMode(false); setNotice("Meetup updated."); await loadMeetups();
            const updated = await apiFetch(`meetups/${detail.id}`); const data = await updated.json().catch(() => ({}));
            if (!updated.ok) throw new Error(messageOf(data, "Updated, but couldn't refresh meetup details."));
            setDetail(data);
        } catch (e) { setModalFeedback(e.message); } finally { setBusy(false); }
    }

    async function createMeetup(event) {
        event.preventDefault(); setBusy(true); setError("");
        const f = new FormData(event.currentTarget);
        const payload = {
            title: f.get("title").trim(), description: f.get("description").trim() || null,
            sport_id: Number(f.get("sport_id")), max_participants: Number(f.get("max_participants")),
            visibility: f.get("visibility"), area: f.get("area").trim(), landmark: f.get("landmark").trim(),
            meetup_time: new Date(f.get("meetup_time")).toISOString(), duration_minutes: Number(f.get("duration_minutes"))
        };
        try {
            const r = await apiFetch("meetups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(messageOf(d, "Could not create meetup."));
            setShowCreate(false); setNotice("Meetup created."); await loadMeetups(); await openDetails(d.meetup_id);
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }

    const hasFilters = Boolean(search.trim() || sportId);
    return <section className="meetups-page">
        <header className="meetups-heading">
            <div><p className="meetups-eyebrow">FIND YOUR GAME</p><h1>Meetups</h1><p>Find a game, bring your people, and get moving.</p></div>
            <div className="meetups-heading-actions">
                <button type="button" className="meetups-secondary-btn" onClick={() => { setShowInvitations(v => !v); setShowCreate(false); }}>Invitations <span className="meetups-count">{invitations.length}</span></button>
                <button
                    type="button"
                    className="meetups-secondary-btn"
                    onClick={async () => {
                        const nextState = !showConfirmations;

                        setShowConfirmations(nextState);
                        setShowInvitations(false);
                        setShowCreate(false);
                        setError("");
                        setNotice("");

                        if (nextState) {
                            try {
                                await loadConfirmations();
                            } catch (e) {
                                setError(e.message);
                            }
                        }
                    }}
                >
                    Confirmations
                    <span className="meetups-count">
                        {pendingConfirmations.length}
                    </span>
                </button>
                <button type="button" className="meetups-primary-btn" onClick={() => { setShowCreate(v => !v); setShowInvitations(false); }}>+ Create meetup</button>
            </div>
        </header>

        {error && <div className="meetups-alert error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        {notice && <div className="meetups-alert success" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}

        {showCreate && <form className="meetups-form" onSubmit={createMeetup}>
            <div className="meetups-form-title"><div><span className="meetups-eyebrow">MAKE IT HAPPEN</span><h2>Create a meetup</h2></div><button type="button" className="meetups-close" onClick={() => setShowCreate(false)}>Close</button></div>
            <div className="meetups-form-grid">
                <label>Meetup title<input name="title" required minLength="3" maxLength="150" placeholder="Evening badminton" /></label>
                <label>Sport<select name="sport_id" required defaultValue=""><option value="" disabled>Select a sport</option>{sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <label>Area<input name="area" required minLength="2" maxLength="100" placeholder="Madhapur" /></label>
                <label>Landmark<input name="landmark" required minLength="2" maxLength="200" placeholder="Near the sports complex" /></label>
                <label>Date and time<input name="meetup_time" type="datetime-local" required min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} /></label>
                <label>Duration<select name="duration_minutes" defaultValue="60">{[[30, "30 minutes"], [60, "1 hour"], [90, "1 hour 30 minutes"], [120, "2 hours"], [180, "3 hours"], [240, "4 hours"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label>Participant limit<input name="max_participants" type="number" min="2" max="100" defaultValue="10" required /></label>
                <label>Visibility<select name="visibility" defaultValue="public"><option value="public">Public · Connections of host</option><option value="private">Private · Invite only</option></select></label>
                <label className="meetups-form-wide">Description<textarea name="description" maxLength="1000" rows="3" placeholder="Share the plan, skill level, or anything players should know." /></label>
            </div>
            <p className="meetups-form-note">You'll automatically be registered as the host and count toward the participant limit.</p>
            <div className="meetups-form-actions"><button type="button" className="meetups-secondary-btn" onClick={() => setShowCreate(false)}>Cancel</button><button className="meetups-primary-btn" disabled={busy}>{busy ? "Creating…" : "Create meetup"}</button></div>
        </form>}

        {showInvitations && <section className="meetups-invitations"><div className="meetups-section-head"><h2>Invitations</h2><button className="meetups-text-btn" onClick={() => loadInvitations().catch(e => setError(e.message))}>Refresh</button></div>
            {!invitations.length ? <p className="meetups-muted">No pending invitations.</p> : invitations.map(inv => <article className="meetups-invite-row" key={inv.invitation_id}><div><strong>{inv.meetup.title}</strong><p>From {inv.host.name} · {inv.meetup.sport_name || sports.find(s => s.id === inv.meetup.sport_id)?.name || "Meetup"}</p><p>{fmt(inv.meetup.meetup_time)} · {inv.meetup.area}</p></div><div className="meetups-row-actions"><button className="meetups-secondary-btn" disabled={busy} onClick={() => respondInvitation(inv, "decline")}>Decline</button><button className="meetups-primary-btn" disabled={busy} onClick={() => respondInvitation(inv, "accept")}>Accept & join</button></div></article>)}
        </section>}

        {showConfirmations && (
            <section className="meetups-invitations">
                <div className="meetups-section-head">
                    <h2>
                        Confirmations
                        {pendingConfirmations.length > 0 &&
                            ` (${pendingConfirmations.length})`}
                    </h2>

                    <button
                        type="button"
                        className="meetups-text-btn"
                        onClick={() =>
                            loadConfirmations().catch(e => setError(e.message))
                        }
                    >
                        Refresh
                    </button>
                </div>

                {pendingConfirmations.length === 0 ? (
                    <p className="meetups-muted">
                        No meetups are waiting for your confirmation.
                    </p>
                ) : (
                    pendingConfirmations.map(meetup => (
                        <article
                            className="meetups-invite-row"
                            key={meetup.id}
                        >
                            <div>
                                <strong>{meetup.title}</strong>

                                <p>
                                    {meetup.sport_name || "Meetup"}
                                    {" · "}
                                    {fmt(meetup.meetup_time)}
                                </p>

                                <p>
                                    {meetup.area}
                                    {meetup.landmark
                                        ? ` · ${meetup.landmark}`
                                        : ""}
                                </p>

                                <p>
                                    Confirmations:{" "}
                                    {meetup.submitted_confirmations}/
                                    {meetup.eligible_participants}
                                </p>

                                <p>
                                    Deadline:{" "}
                                    {meetup.confirmation_deadline
                                        ? fmt(meetup.confirmation_deadline)
                                        : "Not available"}
                                </p>

                                {meetup.my_confirmation && (
                                    <p>
                                        Your confirmation:{" "}
                                        <strong>
                                            {meetup.my_confirmation === "success"
                                                ? "Success"
                                                : "Failure"}
                                        </strong>
                                    </p>
                                )}
                            </div>

                            <div className="meetups-row-actions">
                                {meetup.my_confirmation ? (
                                    <span className="meetups-host-note">
                                        Confirmation submitted
                                    </span>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="meetups-primary-btn"
                                            disabled={votingMeetupId !== null}
                                            onClick={() =>
                                                submitConfirmation(
                                                    meetup.id,
                                                    "success"
                                                )
                                            }
                                        >
                                            {votingMeetupId === meetup.id
                                                ? "Submitting..."
                                                : "Confirm Success"}
                                        </button>

                                        <button
                                            type="button"
                                            className="meetups-secondary-btn"
                                            disabled={votingMeetupId !== null}
                                            onClick={() =>
                                                submitConfirmation(
                                                    meetup.id,
                                                    "failure"
                                                )
                                            }
                                        >
                                            Confirm Failure
                                        </button>
                                    </>
                                )}
                            </div>
                        </article>
                    ))
                )}
            </section>
        )}

        <div className="meetups-toolbar"><label className="meetups-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meetups by title" aria-label="Search meetups" /></label>
            <label className="meetups-sport-filter"><span>Sport</span><select value={sportId} onChange={e => setSportId(e.target.value)}><option value="">All sports</option>{sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            {hasFilters && <button className="meetups-clear-btn" onClick={() => { setSearch(""); setSportId(""); }}>Clear filters</button>}
        </div>

        <div className="meetups-results-head"><h2>Games near your circle</h2><span>{meetups.length} {meetups.length === 1 ? "meetup" : "meetups"}</span></div>
        {loading ? <div className="meetups-state">Loading meetups…</div> : meetups.length === 0 ? <div className="meetups-empty"><div className="meetups-empty-mark">+</div><h3>No meetups found</h3><p>{hasFilters ? "Try changing your search or clearing the filters." : "There aren't any available meetups in your network yet. Create one to get things started."}</p>{!hasFilters && <button className="meetups-primary-btn" onClick={() => setShowCreate(true)}>Create a meetup</button>}</div> : <div className="meetups-grid">{meetups.map(m => <button type="button" className="meetup-card" key={m.id} onClick={() => openDetails(m.id)}>
            <div className="meetup-card-top">
                <span className="meetup-sport-tag">
                    {m.sport_name}
                </span>

                <div className="meetup-card-badges">
                    {m.status === "ongoing" && (
                        <span className="meetup-status-badge ongoing">
                            ONGOING
                        </span>
                    )}

                    <span className={`meetup-visibility ${m.visibility}`}>
                        {m.visibility}
                    </span>
                </div>
            </div>
            <h3>{m.title}</h3><p className="meetup-host">Hosted by <strong>{m.host_name}</strong></p>
            <div className="meetup-meta"><span><i>◷</i>{fmt(m.meetup_time)}</span><span><i>⌖</i>{m.area}</span></div>
            <div className="meetup-card-bottom"><span className="meetup-participant-count"><span className="meetup-dot" />{m.participant_count}/{m.max_participants} players</span><span className="meetup-card-link">View details <b>→</b></span></div>
        </button>)}</div>}

        {detail && <div className="meetups-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null) }}><section className="meetups-modal" role="dialog" aria-modal="true" aria-labelledby="meetup-detail-title"><div className="meetups-modal-head"><span className="meetup-sport-tag">{detail.sport?.name}</span><button className="meetups-close" onClick={() => setDetail(null)} aria-label="Close details">×</button></div>
            <h2 id="meetup-detail-title">{detail.title}</h2><p className="meetups-modal-host">Hosted by {detail.host?.name}</p>
            <div className="meetups-detail-grid"><div><small>WHEN</small><strong>{fmt(detail.meetup_time)}</strong></div><div><small>DURATION</small><strong>{detail.duration_minutes} minutes</strong></div><div><small>LOCATION</small><strong>{detail.area}</strong><span>{detail.landmark}</span></div><div><small>PLAYERS</small><strong>{detail.participant_count}/{detail.max_participants}</strong></div><div><small>VISIBILITY</small><strong>{detail.visibility}</strong></div></div>
            {detail.description && <div className="meetups-description"><h3>About this meetup</h3><p>{detail.description}</p></div>}
            <div className="meetups-players"><h3>Players registered <span>{detail.participants?.length ?? 0}</span></h3>{detail.participants?.map(p => <div className="meetups-player" key={p.user_id}><span className="meetups-player-avatar">{p.name?.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase()}</span><strong>{p.name}</strong>{p.user_id === detail.host?.id && <span className="meetups-host-tag">HOST</span>}{detail.is_host && p.user_id !== detail.host?.id && <button className="meetups-remove-player" disabled={busy} onClick={() => removePlayer(detail.id, p.user_id, p.name)}>Remove</button>}</div>)}</div>
            {detail.is_host && <section className="meetups-host-tools">
                <h3>Host controls</h3>
                <div className="meetups-host-tool-row">
                    <label>Invite a connection<select value={inviteeId} onChange={e => setInviteeId(e.target.value)}><option value="">Choose a player</option>{connections.filter(c => !detail.participants?.some(p => p.user_id === c.player.id)).map(c => <option key={c.player.id} value={c.player.id}>{c.player.first_name} {c.player.last_name}</option>)}</select></label>
                    <button className="meetups-primary-btn" disabled={busy || !inviteeId} onClick={() => actInvite(detail.id, Number(inviteeId))}>Send invitation</button>
                </div>
                <div className="meetups-host-tool-row"><button className="meetups-secondary-btn" disabled={busy} onClick={() => startEditMeetup(detail)}>Edit time / duration</button><button className="meetups-danger-btn" disabled={busy} onClick={() => cancelMeetup(detail.id)}>Cancel meetup</button></div>
                <p className="meetups-form-note">Registered players are listed above. Use Remove beside a player to manage attendance.</p>
                {inviteFeedback && <p className="meetups-inline-feedback error" role="alert">{inviteFeedback}</p>}
            </section>}
            {editMode && <form className="meetups-form meetups-edit-form" onSubmit={saveMeetupEdit}>
                <div className="meetups-form-title"><div><span className="meetups-eyebrow">MEETUP SETTINGS</span><h3>Edit date and time</h3></div></div>
                <div className="meetups-form-grid">
                    <label>Date and time<input type="datetime-local" required min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={editDateTime} onChange={e => setEditDateTime(e.target.value)} /></label>
                    <label>Duration<select value={editDuration} onChange={e => setEditDuration(e.target.value)}>{[[15, "15 minutes"], [30, "30 minutes"], [45, "45 minutes"], [60, "1 hour"], [90, "1 hour 30 minutes"], [120, "2 hours"], [180, "3 hours"], [240, "4 hours"], [360, "6 hours"], [480, "8 hours"], [720, "12 hours"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                </div>
                {modalFeedback && <p className="meetups-inline-feedback error" role="alert">{modalFeedback}</p>}
                <div className="meetups-form-actions"><button type="button" className="meetups-danger-btn" onClick={() => { setEditMode(false); setModalFeedback("") }}>Cancel</button><button className="meetups-primary-btn" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
            </form>}
            {modalFeedback && !editMode && <p className="meetups-inline-feedback error" role="alert">{modalFeedback}</p>}
            <div className="meetups-modal-actions">{detail.is_host ? <span className="meetups-host-note">You're hosting this meetup.</span> : detail.is_participant ? <button className="meetups-danger-btn" disabled={busy} onClick={() => act(`meetups/${detail.id}/join`, "DELETE", "You left the meetup.")}>Leave meetup</button> : detail.invitation_status === "pending" ? <span className="meetups-host-note">Respond to your invitation above.</span> : detail.invitation_status === "accepted" || detail.visibility === "public" ? <button className="meetups-primary-btn" disabled={busy || detail.participant_count >= detail.max_participants} onClick={() => act(`meetups/${detail.id}/join`, "POST", "You joined the meetup.")}>{detail.participant_count >= detail.max_participants ? "Meetup full" : busy ? "Please wait…" : "Join meetup"}</button> : <span className="meetups-host-note">This meetup is invite-only.</span>}<button className="meetups-close-action" onClick={() => setDetail(null)}>Close</button></div>
        </section></div>}
    </section>;
}
export default Meetups;
