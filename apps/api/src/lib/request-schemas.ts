export const API_BODY_LIMIT = 1_048_576

export const submissionBodySchema = {
  type: "object",
  required: ["questionId"],
  anyOf: [{ required: ["lexicalState"] }, { required: ["answerText"] }],
  additionalProperties: false,
  properties: {
    questionId: { type: "string", minLength: 1, maxLength: 100 },
    lexicalState: { type: "object" },
    answerText: { type: "string", maxLength: 50_000 },
    excalidrawData: { type: "array", maxItems: 300, items: { type: "object" } },
    agentType: { type: "string", enum: ["quick", "deep"] },
    mood: { type: "string", enum: ["pragmatist", "systems", "sre", "pm"] },
    modelName: { type: "string", minLength: 1, maxLength: 200 },
  },
} as const

export const replyBodySchema = {
  type: "object",
  required: ["content"],
  additionalProperties: false,
  properties: { content: { type: "string", minLength: 1, maxLength: 5000 } },
} as const

export const saveKeyBodySchema = {
  type: "object",
  required: ["provider", "key"],
  additionalProperties: false,
  properties: {
    provider: { type: "string", enum: ["openai"] },
    key: { type: "string", minLength: 1, maxLength: 512 },
    baseUrl: { type: "string", maxLength: 2048 },
    modelName: { type: "string", maxLength: 200 },
    validate: { type: "boolean" },
  },
} as const
