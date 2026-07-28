import { dict } from "../../src/hooks/dict";

function collectLeafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    collectLeafKeys(nested, prefix ? `${prefix}.${key}` : key)
  );
}

describe("translation dictionary", () => {
  it("keeps Indonesian and English translation keys in sync", () => {
    const idKeys = collectLeafKeys(dict.id).sort();
    const enKeys = collectLeafKeys(dict.en).sort();

    expect(enKeys).toEqual(idKeys);
  });
});
