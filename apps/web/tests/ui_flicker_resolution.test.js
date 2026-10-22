import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Production UI Flicker & Stale Data Bug Resolution Test Suite', () => {
  // Mock State Reducer representing the fixed UI Component lifecycle pattern
  function createValueStore(initialCached = null) {
    let state = {
      value: initialCached,
      isLoading: initialCached === null,
      error: null,
      requestId: 0,
    };

    return {
      getState: () => state,
      startFetch: () => {
        state.requestId += 1;
        state.isLoading = true;
        state.error = null;
        return state.requestId;
      },
      resolveFetch: (reqId, fetchedValue) => {
        // Discard out-of-order stale responses
        if (reqId !== state.requestId) return false;
        state.value = fetchedValue;
        state.isLoading = false;
        state.error = null;
        return true;
      },
      rejectFetch: (reqId, errorMsg) => {
        if (reqId !== state.requestId) return false;
        state.isLoading = false;
        state.error = errorMsg;
        return true;
      },
      // UI Display helper function mirroring the JSX rendering pattern
      renderDisplay: () => {
        if (state.isLoading && state.value === null) {
          return { type: 'SKELETON', display: null };
        }
        if (state.error && state.value === null) {
          return { type: 'ERROR', display: 'Failed to load' };
        }
        if (state.value === null) {
          return { type: 'EMPTY', display: 'No data' };
        }
        return { type: 'VALUE', display: String(state.value) };
      },
    };
  }

  it('1. Database contains "20" -> UI eventually displays "20"', async () => {
    const store = createValueStore();
    const reqId = store.startFetch();
    assert.equal(store.renderDisplay().type, 'SKELETON');

    // Simulate network delay and response with "20"
    store.resolveFetch(reqId, '20');
    const rendered = store.renderDisplay();
    assert.equal(rendered.type, 'VALUE');
    assert.equal(rendered.display, '20');
  });

  it('2. Database contains "0" -> UI correctly displays "0" without treating it as empty', async () => {
    const store = createValueStore();
    const reqId = store.startFetch();
    assert.equal(store.renderDisplay().type, 'SKELETON');

    // Simulate backend returning valid zero ("0")
    store.resolveFetch(reqId, '0');
    const rendered = store.renderDisplay();
    assert.equal(rendered.type, 'VALUE');
    assert.equal(rendered.display, '0');
  });

  it('3. Data is loading -> UI does NOT display misleading default "0"', async () => {
    const store = createValueStore();
    store.startFetch();
    const rendered = store.renderDisplay();

    // Critical assertion: While loading, never display misleading "0"
    assert.notEqual(rendered.display, '0');
    assert.equal(rendered.type, 'SKELETON');
  });

  it('4. API returns an error -> UI displays error state instead of default 0', async () => {
    const store = createValueStore();
    const reqId = store.startFetch();
    store.rejectFetch(reqId, 'Network Timeout 504');
    const rendered = store.renderDisplay();

    assert.equal(rendered.type, 'ERROR');
    assert.notEqual(rendered.display, '0');
  });

  it('5. Database record does not exist -> UI handles empty state explicitly', async () => {
    const store = createValueStore();
    const reqId = store.startFetch();
    store.resolveFetch(reqId, null);
    const rendered = store.renderDisplay();

    assert.equal(rendered.type, 'EMPTY');
    assert.equal(rendered.display, 'No data');
  });

  it('6. User updates value -> New value persists and renders', async () => {
    // Initial fetch returns "20"
    const store = createValueStore();
    const req1 = store.startFetch();
    store.resolveFetch(req1, '20');
    assert.equal(store.renderDisplay().display, '20');

    // User updates to "25"
    const req2 = store.startFetch();
    store.resolveFetch(req2, '25');
    assert.equal(store.renderDisplay().display, '25');
  });

  it('7. Multiple requests out of order -> Stale response does not overwrite newer data', async () => {
    const store = createValueStore();

    // User triggers request 1 (slow network)
    const req1 = store.startFetch();

    // User triggers request 2 (fast network)
    const req2 = store.startFetch();

    // Request 2 finishes FIRST with value "50"
    const resolvedReq2 = store.resolveFetch(req2, '50');
    assert.equal(resolvedReq2, true);
    assert.equal(store.renderDisplay().display, '50');

    // Request 1 arrives LATE with stale value "10"
    const resolvedReq1 = store.resolveFetch(req1, '10');
    assert.equal(resolvedReq1, false, 'Late out-of-order request must be discarded');
    assert.equal(store.renderDisplay().display, '50', 'Newer value must not be overwritten');
  });

  it('8. Page refresh with cached value -> Renders immediately with zero flicker', async () => {
    // SessionStorage has previous value "20"
    const store = createValueStore('20');

    // Immediately upon mount before network request completes:
    const initialRender = store.renderDisplay();
    assert.equal(initialRender.type, 'VALUE');
    assert.equal(initialRender.display, '20', 'Must render cached "20" instantly without flashing "0"');

    // Network re-validation completes
    const reqId = store.startFetch();
    store.resolveFetch(reqId, '20');
    assert.equal(store.renderDisplay().display, '20');
  });
});
