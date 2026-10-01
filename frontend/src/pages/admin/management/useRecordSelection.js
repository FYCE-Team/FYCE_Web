import { useState } from "react";
export function useRecordSelection(items, scope) {
  const [state, setState] = useState({ scope, ids: [] });
  const eligible = items
    .filter((item) => item.role !== "admin")
    .map((item) => String(item._id || item.id));
  const ids =
    state.scope === scope
      ? state.ids.filter((id) => eligible.includes(id))
      : [];
  const toggle = (id) =>
    setState({
      scope,
      ids: ids.includes(String(id))
        ? ids.filter((value) => value !== String(id))
        : [...ids, String(id)],
    });
  const all = eligible.length > 0 && eligible.every((id) => ids.includes(id));
  return {
    ids,
    all,
    toggle,
    toggleAll: () => setState({ scope, ids: all ? [] : eligible }),
    clear: () => setState({ scope, ids: [] }),
    disabled: !eligible.length,
  };
}
