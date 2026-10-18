WITH rubric_totals AS (
  SELECT
    question.id,
    SUM(
      CASE
        WHEN jsonb_typeof(dimension.value -> 'weight') = 'number'
          THEN (dimension.value ->> 'weight')::numeric
        ELSE 0
      END
    ) AS total_weight
  FROM "Question" AS question
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(question.rubric -> 'dimensions') = 'array'
        THEN question.rubric -> 'dimensions'
      ELSE '[]'::jsonb
    END
  ) AS dimension(value)
  GROUP BY question.id
)
UPDATE "Question" AS question
SET rubric = jsonb_set(
  question.rubric,
  '{dimensions}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        dimension.value,
        '{weight}',
        to_jsonb(
          (
            CASE
              WHEN jsonb_typeof(dimension.value -> 'weight') = 'number'
                THEN (dimension.value ->> 'weight')::numeric
              ELSE 0
            END / rubric_totals.total_weight
          )::double precision
        )
      )
    )
    FROM jsonb_array_elements(question.rubric -> 'dimensions') AS dimension(value)
  )
)
FROM rubric_totals
WHERE rubric_totals.id = question.id
  AND rubric_totals.total_weight > 0
  AND jsonb_typeof(question.rubric -> 'dimensions') = 'array';
