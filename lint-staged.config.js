export default {
  "*": "prettier --ignore-unknown --write",
  // Content rules are cross-file (links, structure), so lint all content once.
  "content/**": () => "pnpm lint:content",
  "scripts/**/*.ts": () => ["pnpm typecheck", "pnpm test"],
};
