export const api = new Proxy({}, {
  get: function(target, prop, receiver) {
    if (prop === 'default') return undefined;
    if (prop === '__esModule') return true;
    return new Proxy({}, {
      get: function(t, p, r) {
        if (p === 'default') return undefined;
        if (p === '__esModule') return true;
        return `${prop}:${p}`;
      }
    });
  }
});
