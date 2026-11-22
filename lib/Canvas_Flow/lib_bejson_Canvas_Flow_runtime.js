/**
 * Library:        lib_bejson_Canvas_Flow_runtime.js
 * Family:         Canvas_Flow
 * Description:    Interactive Asynchronous Step-by-Step Flow Execution Runtime
 *                 Controller supporting Play, Pause, Resume, Stop, live time_running
 *                 tracking, and UI highlight callbacks.
 * Version:        1.0.0
 * Date Created:   2026-11-22
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  4f9a38c1-7d24-4b88-a312-9c7e51d204b8
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

(function () {
  const STATUS_IDLE      = 'IDLE';
  const STATUS_RUNNING   = 'RUNNING';
  const STATUS_PAUSED    = 'PAUSED';
  const STATUS_STOPPED   = 'STOPPED';
  const STATUS_COMPLETED = 'COMPLETED';

  /**
   * Create an interactive flow execution controller bound to a createFlowStore() instance.
   * @param {Object} store - Flow store instance
   * @param {Object} [options] - { stepIntervalMs: number, maxSteps: number }
   */
  function createFlowRuntime(store, options = {}) {
    if (!store || !store.state) {
      throw new Error('createFlowRuntime requires a valid Canvas_Flow store instance.');
    }

    const stepIntervalMs = Number.isFinite(Number(options.stepIntervalMs))
      ? Math.max(20, Number(options.stepIntervalMs))
      : 350;
    const maxSteps = Number.isFinite(Number(options.maxSteps))
      ? Math.max(1, Number(options.maxSteps))
      : 100;

    let timerHandle = null;
    let currentNode = null;
    let context = {};
    let loopCounters = {};
    let stepLog = [];
    let accumulatedTimeMs = 0;
    let lastResumeTimestamp = 0;

    function clearTimer() {
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
        timerHandle = null;
      }
    }

    function getElapsedTimeMs() {
      if (store.state.runtimeState.status === STATUS_RUNNING && lastResumeTimestamp > 0) {
        return accumulatedTimeMs + Math.max(0, Date.now() - lastResumeTimestamp);
      }
      return accumulatedTimeMs;
    }

    function updateStoreRuntimeState(patch = {}, reason = 'runtime:tick') {
      store.state.runtimeState = {
        ...store.state.runtimeState,
        ...patch,
        timeRunningMs: getElapsedTimeMs()
      };
      if (typeof store.notify === 'function') {
        store.notify(reason);
      }
    }

    function stepOnce() {
      if (!currentNode) {
        const nodes = store.state.nodes || [];
        currentNode = nodes.find(function (n) { return n.type === 'start'; }) || null;
      }

      if (!currentNode) {
        clearTimer();
        updateStoreRuntimeState({
          status: STATUS_STOPPED,
          activeNodeId: null,
          activeConnectorId: null,
          lastReason: 'Missing Start node.'
        }, 'runtime:error');
        return { done: true, error: 'Missing Start node.' };
      }

      const nextStepNum = (store.state.runtimeState.stepCount || 0) + 1;
      if (nextStepNum > maxSteps) {
        clearTimer();
        updateStoreRuntimeState({
          status: STATUS_STOPPED,
          lastReason: 'Exceeded max step ceiling.'
        }, 'runtime:error');
        return { done: true, error: 'Exceeded max step ceiling.' };
      }

      // Update elapsed time_running in context (ensures deterministic progression even in fast tests)
      const realElapsed = getElapsedTimeMs();
      const simulatedMinElapsed = (nextStepNum - 1) * stepIntervalMs;
      context.time_running = Math.max(realElapsed, simulatedMinElapsed);
      accumulatedTimeMs = context.time_running;
      if (store.state.runtimeState.status === STATUS_RUNNING) {
        lastResumeTimestamp = Date.now();
      }

      const outcome = store.executeSingleStep(currentNode, context, loopCounters);
      const entry = {
        step: nextStepNum,
        timeRunningMs: context.time_running,
        ...outcome.stepRecord
      };
      stepLog.push(entry);

      if (outcome.error) {
        clearTimer();
        updateStoreRuntimeState({
          status: STATUS_STOPPED,
          activeNodeId: currentNode.id,
          activeConnectorId: null,
          stepCount: nextStepNum,
          lastReason: outcome.error
        }, 'runtime:error');
        return { done: true, error: outcome.error, step: entry };
      }

      if (outcome.reachedEnd) {
        clearTimer();
        const finalStatus = outcome.shouldStop ? STATUS_COMPLETED : STATUS_STOPPED;
        const reason = outcome.stopEvaluation ? outcome.stopEvaluation.reason : 'End node reached.';
        updateStoreRuntimeState({
          status: finalStatus,
          activeNodeId: currentNode.id,
          activeConnectorId: null,
          stepCount: nextStepNum,
          lastReason: reason
        }, 'runtime:completed');
        currentNode = null;
        return {
          done: true,
          stopConditionMet: outcome.shouldStop,
          stopEvaluation: outcome.stopEvaluation,
          step: entry
        };
      }

      const chosenConnId = outcome.chosenConnector ? outcome.chosenConnector.id : null;
      const prevNodeId = currentNode.id;
      currentNode = outcome.nextNode;

      updateStoreRuntimeState({
        activeNodeId: prevNodeId,
        activeConnectorId: chosenConnId,
        stepCount: nextStepNum,
        lastReason: `Executed ${entry.label} (${entry.type})`
      }, 'runtime:step');

      return { done: false, step: entry, nextNodeId: currentNode ? currentNode.id : null };
    }

    function scheduleNextTick() {
      clearTimer();
      if (store.state.runtimeState.status !== STATUS_RUNNING) return;
      timerHandle = setTimeout(function () {
        if (store.state.runtimeState.status !== STATUS_RUNNING) return;
        const res = stepOnce();
        if (!res.done && store.state.runtimeState.status === STATUS_RUNNING) {
          scheduleNextTick();
        }
      }, stepIntervalMs);
    }

    function play(initialContext = {}) {
      clearTimer();
      const startNode = (store.state.nodes || []).find(function (n) { return n.type === 'start'; });
      if (!startNode) {
        updateStoreRuntimeState({
          status: STATUS_STOPPED,
          activeNodeId: null,
          activeConnectorId: null,
          stepCount: 0,
          lastReason: 'Missing Start node.'
        }, 'runtime:error');
        return false;
      }

      currentNode = startNode;
      context = { time_running: 0, ...initialContext };
      loopCounters = {};
      stepLog = [];
      accumulatedTimeMs = Number(initialContext.time_running || 0);
      lastResumeTimestamp = Date.now();

      updateStoreRuntimeState({
        status: STATUS_RUNNING,
        activeNodeId: startNode.id,
        activeConnectorId: null,
        stepCount: 0,
        timeRunningMs: accumulatedTimeMs,
        lastReason: 'Flow execution started.'
      }, 'runtime:play');

      const firstRes = stepOnce();
      if (!firstRes.done && store.state.runtimeState.status === STATUS_RUNNING) {
        scheduleNextTick();
      }
      return true;
    }

    function pause() {
      if (store.state.runtimeState.status !== STATUS_RUNNING) return false;
      accumulatedTimeMs = getElapsedTimeMs();
      lastResumeTimestamp = 0;
      clearTimer();
      updateStoreRuntimeState({
        status: STATUS_PAUSED,
        lastReason: `Paused at step ${store.state.runtimeState.stepCount}.`
      }, 'runtime:pause');
      return true;
    }

    function resume() {
      if (store.state.runtimeState.status !== STATUS_PAUSED) return false;
      lastResumeTimestamp = Date.now();
      updateStoreRuntimeState({
        status: STATUS_RUNNING,
        lastReason: `Resumed from step ${store.state.runtimeState.stepCount}.`
      }, 'runtime:resume');

      const res = stepOnce();
      if (!res.done && store.state.runtimeState.status === STATUS_RUNNING) {
        scheduleNextTick();
      }
      return true;
    }

    function stop() {
      clearTimer();
      currentNode = null;
      context = {};
      loopCounters = {};
      accumulatedTimeMs = 0;
      lastResumeTimestamp = 0;

      updateStoreRuntimeState({
        status: STATUS_STOPPED,
        activeNodeId: null,
        activeConnectorId: null,
        stepCount: 0,
        timeRunningMs: 0,
        lastReason: 'Flow stopped and reset.'
      }, 'runtime:stop');
      return true;
    }

    function getSnapshot() {
      return {
        status: store.state.runtimeState.status,
        activeNodeId: store.state.runtimeState.activeNodeId,
        activeConnectorId: store.state.runtimeState.activeConnectorId,
        stepCount: store.state.runtimeState.stepCount,
        timeRunningMs: getElapsedTimeMs(),
        lastReason: store.state.runtimeState.lastReason,
        context: { ...context },
        stepLog: stepLog.slice()
      };
    }

    // Automatically halt timer if flow graph is replaced or active node is deleted mid-run
    if (typeof store.subscribe === 'function') {
      store.subscribe(function (_s, reason) {
        if (reason === 'file:new' || reason === 'file:import') {
          if (store.state.runtimeState.status === STATUS_RUNNING || store.state.runtimeState.status === STATUS_PAUSED) {
            stop();
          }
        } else if (
          (reason === 'node:delete' || reason === 'edit:undo' || reason === 'edit:redo') &&
          currentNode &&
          !(store.state.nodes || []).some(function (n) { return n.id === currentNode.id; })
        ) {
          stop();
        }
      });
    }

    return {
      play: play,
      pause: pause,
      resume: resume,
      stop: stop,
      stepOnce: stepOnce,
      getSnapshot: getSnapshot
    };
  }

  const FlowRuntimeExports = {
    VERSION: '1.1.0',
    STATUS_IDLE: STATUS_IDLE,
    STATUS_RUNNING: STATUS_RUNNING,
    STATUS_PAUSED: STATUS_PAUSED,
    STATUS_STOPPED: STATUS_STOPPED,
    STATUS_COMPLETED: STATUS_COMPLETED,
    createFlowRuntime: createFlowRuntime
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowRuntimeExports;
  }
  if (typeof window !== 'undefined') {
    window.BEJSON_CANVAS_FLOW_RUNTIME = FlowRuntimeExports;
  }
})();
