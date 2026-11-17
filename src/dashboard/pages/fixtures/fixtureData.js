import { useCallback, useEffect, useState } from 'react';
import api from '../../../services/api';
import { buildCategoryList } from '../../utils/sportSheets';

/**
 * The browser only talks to RegX. RegX talks to the fixture service with its
 * own key, so nothing here knows that service's address or credentials.
 */

/**
 * Every registration for the form, grouped into the categories competitors
 * are drawn in — the same grouping the server uses to send players.
 */
export const useFixtureData = (formId) => {
    const [state, setState] = useState({ loading: true, error: null, form: null, event: null, categories: [] });

    useEffect(() => {
        let live = true;

        setState((current) => ({ ...current, loading: true, error: null }));

        api.get(`/forms/${formId}/submissions/export`, { params: { eligible: 1 } })
            .then((payload) => {
                if (!live) return;

                setState({
                    loading: false,
                    error: null,
                    form: payload.context?.form ?? payload.form ?? null,
                    event: payload.context?.event ?? null,
                    categories: buildCategoryList(payload.data ?? []),
                });
            })
            .catch((error) => {
                if (!live) return;

                setState((current) => ({ ...current, loading: false, error: messageOf(error, 'Could not load registrations') }));
            });

        return () => {
            live = false;
        };
    }, [formId]);

    return state;
};

export const messageOf = (error, fallback) =>
    error?.response?.data?.messages?.error ||
    Object.values(error?.response?.data?.messages ?? {})[0] ||
    error?.response?.data?.message ||
    fallback;

/**
 * What RegX stores for the form's fixtures, plus the fixture service's types
 * and whether it is connected.
 */
export const useFixtureState = (formId) => {
    const [state, setState] = useState({
        loading: true,
        error: null,
        service: { configured: false, error: null },
        types: [],
        fixture: null,
        categories: [],
    });

    const apply = (payload) =>
        setState((current) => ({
            ...current,
            loading: false,
            error: null,
            service: payload.service ?? current.service,
            types: payload.types ?? current.types,
            fixture: payload.fixture ?? null,
            categories: payload.categories ?? [],
        }));

    useEffect(() => {
        let live = true;

        api.get(`/forms/${formId}/fixture`)
            .then((payload) => live && apply(payload))
            .catch((error) => live && setState((current) => ({ ...current, loading: false, error: messageOf(error, 'Could not load fixtures') })));

        return () => {
            live = false;
        };
    }, [formId]);

    /** Creates the form's collection in the fixture service (or updates its type). */
    const saveType = useCallback(async (fixtureType) => {
        try {
            apply(await api.put(`/forms/${formId}/fixture`, { fixtureType }));
            return { ok: true };
        } catch (error) {
            return { ok: false, message: messageOf(error, 'Could not save the fixture type') };
        }
    }, [formId]);

    /**
     * Creates the category's bracket, sends its players and generates the draw.
     * With redraw, the existing draw is thrown away first and rebuilt from
     * whoever is registered now.
     */
    const startCategory = useCallback(async (category, redraw = false) => {
        try {
            apply(await api.post(`/forms/${formId}/fixture/categories`, { category, redraw }));
            return { ok: true };
        } catch (error) {
            // Reload so a failed attempt's stored error shows on the card.
            api.get(`/forms/${formId}/fixture`).then(apply).catch(() => {});
            return { ok: false, message: messageOf(error, redraw ? 'Could not redraw this category' : 'Could not start this category') };
        }
    }, [formId]);

    /** Draws a category again with its late registrations, while nothing has been played. */
    const addLateEntries = useCallback(async (category) => {
        try {
            const payload = await api.post(`/forms/${formId}/fixture/categories/late`, { category });
            apply(payload);
            return { ok: true, message: payload.message };
        } catch (error) {
            return { ok: false, message: messageOf(error, 'Could not add the late entries') };
        }
    }, [formId]);

    /** Deletes the category's draw, so it can be started fresh. */
    const resetCategory = useCallback(async (category) => {
        try {
            apply(await api.delete(`/forms/${formId}/fixture/categories`, { data: { category } }));
            return { ok: true };
        } catch (error) {
            return { ok: false, message: messageOf(error, 'Could not reset this category') };
        }
    }, [formId]);

    const stateOf = useCallback(
        (category) => state.categories.find((item) => item.category === category) ?? null,
        [state.categories]
    );

    // A completed category is still a started one — it can be opened, just not changed.
    const isStarted = useCallback((category) => ['started', 'completed'].includes(stateOf(category)?.status), [stateOf]);
    const isCompleted = useCallback((category) => stateOf(category)?.status === 'completed', [stateOf]);

    /** Locks a category whose matches are all decided. */
    const completeCategory = useCallback(async (category) => {
        try {
            apply(await api.post(`/forms/${formId}/fixture/categories/complete`, { category }));
            return { ok: true };
        } catch (error) {
            return { ok: false, message: messageOf(error, 'Could not complete this category') };
        }
    }, [formId]);

    return { ...state, saveType, startCategory, addLateEntries, resetCategory, completeCategory, stateOf, isStarted, isCompleted };
};

/**
 * A refusal the caller can act on: the later matches that would be cleared.
 */
const refusal = (error, fallback) => ({
    ok: false,
    message: messageOf(error, fallback),
    needsReset: error?.response?.data?.code === 'FOLLOWING_MATCHES_DECIDED',
    affected: error?.response?.data?.affected ?? [],
});

/** A started category's draw, as the fixture service has it. */
export const useDraw = (formId, category, enabled) => {
    const [state, setState] = useState({
        loading: enabled, error: null, rounds: {}, bracket: null, players: [], category: null, tables: {}, byes: new Set(),
        fouls: { enabled: false, limit: 0, auto: false },
    });

    const fromPayload = (payload) => ({
        loading: false,
        error: null,
        rounds: payload.rounds ?? {},
        bracket: payload.bracket ?? null,
        players: payload.players ?? [],
        category: payload.category ?? null,
        // { matchId: table } for the matches on a hall table right now.
        tables: payload.tables ?? {},
        // How many tables the hall has (0 = tables are not used).
        tableCount: Number(payload.tableCount ?? 0),
        // "matchId:playerId" for each player who reached that match on a bye.
        byes: new Set(payload.byes ?? []),
        // The form's foul rules: { enabled, limit, auto }.
        fouls: payload.fouls ?? { enabled: false, limit: 0, auto: false },
    });

    const load = useCallback(() => {
        setState((current) => ({ ...current, loading: true, error: null }));

        return api.get(`/forms/${formId}/fixture/draw`, { params: { category } })
            .then((payload) => setState(fromPayload(payload)))
            .catch((error) => setState((current) => ({ ...current, loading: false, error: messageOf(error, 'Could not load the draw') })));
    }, [formId, category]);

    useEffect(() => {
        if (enabled) load();
    }, [enabled, load]);

    /**
     * Records the winner. Correcting a result whose winner already played on is
     * refused until resetFollowing says those later matches may be cleared; the
     * refusal names them, so the caller can ask first.
     */
    const setWinner = useCallback(async (matchId, winnerPlayerId, player1Score, player2Score, resetFollowing = false) => {
        try {
            const payload = await api.put(`/forms/${formId}/fixture/matches/${matchId}/winner`, {
                category, winnerPlayerId, player1Score, player2Score, resetFollowing,
            });

            setState(fromPayload(payload));
            return { ok: true };
        } catch (error) {
            return refusal(error, 'Could not save the winner');
        }
    }, [formId, category]);

    /** Puts a match back to "not played". */
    const resetWinner = useCallback(async (matchId, resetFollowing = false) => {
        try {
            const payload = await api.delete(`/forms/${formId}/fixture/matches/${matchId}/winner`, {
                data: { category, resetFollowing },
            });

            setState(fromPayload(payload));
            return { ok: true };
        } catch (error) {
            return refusal(error, 'Could not clear the result');
        }
    }, [formId, category]);

    /**
     * Sets a player's fouls. outcome says whether that reached the limit, and
     * whether the match was decided on it (when the rules record it automatically).
     */
    const setFouls = useCallback(async (matchId, playerId, fouls) => {
        try {
            const payload = await api.put(`/forms/${formId}/fixture/matches/${matchId}/fouls`, { category, playerId, fouls });

            setState(fromPayload(payload));
            return { ok: true, outcome: payload.outcome ?? {} };
        } catch (error) {
            return { ok: false, message: messageOf(error, 'Could not save the fouls') };
        }
    }, [formId, category]);

    /** Puts a waiting match on a table by hand; it stays there until decided. */
    const moveToTable = useCallback(async (matchId, table) => {
        try {
            const payload = await api.put(`/forms/${formId}/fixture/matches/${matchId}/table`, { category, table });

            setState(fromPayload(payload));
            return { ok: true };
        } catch (error) {
            return { ok: false, message: messageOf(error, 'Could not move the match') };
        }
    }, [formId, category]);

    return { ...state, reload: load, setWinner, resetWinner, setFouls, moveToTable };
};
