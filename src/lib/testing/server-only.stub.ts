// Remplaçant du marqueur « server-only » pendant les tests.
//
// Le vrai module lève une erreur dès qu'il est chargé hors d'un Server
// Component — c'est précisément ce qui garantit que la clé d'API ne peut pas
// partir dans le navigateur. Les tests s'exécutent dans Node, hors de ce
// contexte : cet alias, déclaré dans vitest.config.ts, les laisse importer les
// modules serveur sans affaiblir la garantie en production.
export {};
