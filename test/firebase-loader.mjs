const FIREBASE_MODULE = new URL('./fixtures/firebase.mjs', import.meta.url).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('https://www.gstatic.com/firebasejs/')) {
    return {
      shortCircuit: true,
      url: FIREBASE_MODULE,
    };
  }

  return nextResolve(specifier, context);
}
