import { describe, it, expect } from "vitest";
import {
  PERSONAS, PERSONA_PROMPTS, FALLBACK_MODEL_ORDER, MODEL_OPTIONS,
  TOPIC_CATEGORIES, findPersona, personaSystemPrompt,
} from "../../src/components/ai/aiPersonaData";

describe("PERSONAS", () => {
  it("đủ 4 persona với id duy nhất", () => {
    expect(PERSONAS).toHaveLength(4);
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(4);
  });
  it("mỗi persona đủ field", () => {
    for (const p of PERSONAS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.role).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.defaultGreeting).toBeTruthy();
      expect(p.badgeColor).toMatch(/^bg-/);
    }
  });
  it("mỗi persona có system prompt", () => {
    for (const p of PERSONAS) {
      expect(PERSONA_PROMPTS[p.id]).toBeTruthy();
      expect(PERSONA_PROMPTS[p.id].length).toBeGreaterThan(50);
    }
  });
});

describe("findPersona", () => {
  it("tìm đúng id", () => {
    expect(findPersona("hacker").name).toBe("CYBER_GHOST_95");
  });
  it("id lạ → fallback cybercat (không crash)", () => {
    expect(findPersona("ghost-id").id).toBe("cybercat");
  });
});

describe("personaSystemPrompt", () => {
  it("prompt base khi không có extra", () => {
    expect(personaSystemPrompt("cybercat")).toBe(PERSONA_PROMPTS.cybercat);
  });
  it("ghép extra với \n\n", () => {
    const p = personaSystemPrompt("cybercat", "KIẾN THỨC SITE");
    expect(p).toContain(PERSONA_PROMPTS.cybercat);
    expect(p).toContain("KIẾN THỨC SITE");
  });
  it("persona lạ → dùng cybercat prompt", () => {
    expect(personaSystemPrompt("nope")).toBe(PERSONA_PROMPTS.cybercat);
  });
});

describe("model config", () => {
  it("FALLBACK_MODEL_ORDER không trùng", () => {
    expect(new Set(FALLBACK_MODEL_ORDER).size).toBe(FALLBACK_MODEL_ORDER.length);
  });
  it("MODEL_OPTIONS chứa 'auto' + tất cả fallback models", () => {
    const ids = MODEL_OPTIONS.map((m) => m.id);
    expect(ids).toContain("auto");
    for (const m of FALLBACK_MODEL_ORDER) expect(ids).toContain(m);
  });
  it("TOPIC_CATEGORIES mỗi category có topics", () => {
    for (const c of TOPIC_CATEGORIES) {
      expect(c.topics.length).toBeGreaterThan(0);
      expect(c.category).toBeTruthy();
    }
  });
});
