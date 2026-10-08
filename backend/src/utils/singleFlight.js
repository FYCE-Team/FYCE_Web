// Coalesce concurrent identical public reads only; retain no stale result after completion.
export const singleFlight = loader => {
  let pending = null;
  return () => {
    if (!pending) {
      pending = Promise.resolve().then(loader).finally(() => { pending = null; });
    }
    return pending;
  };
};
