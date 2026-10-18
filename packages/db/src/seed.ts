import "dotenv/config"
import { normalizeRubric } from "@sysdesign/shared"
import { db } from "./index.js"
import { questions } from "./seed-data.js"

async function seed() {
  console.log("Seeding database...")

  for (const q of questions) {
    const rubric = normalizeRubric(q.rubric)
    const existing = await db.question.findFirst({ where: { title: q.title } })
    const data = {
      title: q.title,
      prompt: q.prompt,
      difficulty: q.difficulty,
      category: q.category,
      estimatedMins: q.estimatedMins,
      hints: q.hints,
      coverageChecklist: q.coverageChecklist,
      rubric: rubric as object,
      referenceSolution: q.referenceSolution ?? null,
      isPublished: true,
    }
    if (existing) {
      await db.question.update({ where: { id: existing.id }, data })
      console.log(`  ↻ Updated "${q.title}"`)
      continue
    }
    await db.question.create({ data })
    console.log(`  ✓ Created "${q.title}"`)
  }

  console.log("Seeding complete")
  await db.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
