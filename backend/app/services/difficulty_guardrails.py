# app/services/difficulty_guardrails.py
from __future__ import annotations


# ---------------------------
# Age-aware difficulty guardrails (STRICT)
# - keyed ONLY by (age_range_code, difficulty)
# - returns ONLY bullet lines (no min/max/name/grade metadata)
# ---------------------------

def difficulty_guardrails_for(code: str | None, difficulty: str) -> list[str]:
    c = (code or "").strip()
    d = (difficulty or "").strip().casefold()

    if not c:
        return []
    if d not in {"easy", "medium", "hard", "impossible"}:
        return []

    match c:
        # Preschool (grades-K-1)
        case "grades-K-1":
            match d:
                case "easy":
                    return [
                        "- Use very short, very simple sentences.",
                        "- One-step thinking only.",
                        "- Use familiar everyday contexts (home, toys, animals).",
                        "- Avoid new academic terms; if needed, define in 5 words or less.",
                    ]
                case "medium":
                    return [
                        "- Keep sentences short and concrete.",
                        "- At most two small steps (no hidden steps).",
                        "- Use simple cause/effect or matching, not abstract reasoning.",
                        "- Define any new word immediately in the correct explanation.",
                    ]
                case "hard":
                    return [
                        "- Keep language very simple and concrete.",
                        "- Allow a small puzzle, but keep it single-concept.",
                        "- No multi-step reasoning chains; difficulty comes from careful thinking, not complexity.",
                        "- Avoid anything requiring reading comprehension beyond the stem.",
                    ]
                case "impossible":
                    return [
                        "- Keep language extremely simple (preschool level), but make the logic deceptively tricky.",
                        "- Use one clear concept, but hide the key clue in the wording (no ambiguity).",
                        "- Distractors must be very plausible and based on common misunderstandings.",
                        "- Require careful attention to a single detail (shape/size/order/count) without multi-step chains.",
                    ]

        # Early Elementary (grades-2-4)
        case "grades-2-4":
            match d:
                case "easy":
                    return [
                        "- Use short, simple sentences.",
                        "- One-step thinking only; avoid multi-step reasoning.",
                        "- Do not assume prior knowledge beyond everyday experience.",
                        "- Avoid jargon; define key terms in the correct explanation.",
                    ]
                case "medium":
                    return [
                        "- Allow two-step reasoning, but keep steps obvious.",
                        "- Use concrete scenarios; avoid abstract terms.",
                        "- Keep explanations brief and direct.",
                        "- If a term is needed, define it with a short example.",
                    ]
                case "hard":
                    return [
                        "- Allow up to 2–3 steps, but keep wording simple.",
                        "- Prefer comparison/sequence/cause-effect with clear cues.",
                        "- Don’t require memorized facts; provide enough context in the question.",
                        "- Explanations should name the key clue that makes the correct choice correct.",
                    ]
                case "impossible":
                    return [
                        "- Keep vocabulary simple, but make distractors extremely close to correct.",
                        "- Use a single concept, but require careful reading and precise interpretation.",
                        "- Allow up to 2–3 small reasoning steps supported by the stem (no hidden assumptions).",
                        "- Distractors should reflect realistic misconceptions (overgeneralization, reversed cause/effect, off-by-one).",
                    ]

        # Upper Elementary (grades-5-6)
        case "grades-5-6":
            match d:
                case "easy":
                    return [
                        "- Use short, clear sentences.",
                        "- One-step thinking; keep the concept straightforward.",
                        "- Don’t assume specialized prior knowledge.",
                        "- Define any key term in the correct explanation.",
                    ]
                case "medium":
                    return [
                        "- Allow 2–3 steps, but keep the question stem simple.",
                        "- Use basic academic vocabulary if needed (define briefly).",
                        "- Prefer application in a familiar scenario over trivia.",
                        "- Keep explanations specific to each choice (why it’s right/wrong).",
                    ]
                case "hard":
                    return [
                        "- Allow multi-step reasoning (up to ~3–4 steps) but keep language age-appropriate.",
                        "- Use richer distractors that reflect common misconceptions.",
                        "- Avoid requiring obscure memorized facts; include needed context.",
                        "- Explanations should reference the deciding rule/clue, not just restate the answer.",
                    ]
                case "impossible":
                    return [
                        "- Keep tone age-appropriate, but require deep understanding of a single concept.",
                        "- Allow multi-step reasoning (up to ~4 steps) while keeping the stem readable.",
                        "- Make distractors 'nearly right' but wrong for different reasons (misconception vs. logic slip vs. definition).",
                        "- Explanations must name the decisive principle and the specific error in each wrong choice.",
                    ]

        # Middle School (grades-7-8)
        case "grades-7-8":
            match d:
                case "easy":
                    return [
                        "- Keep sentences clear and fairly short.",
                        "- Mostly one-step or two-step reasoning.",
                        "- Avoid heavy jargon; define new terms briefly.",
                        "- Prefer concrete examples for abstract ideas.",
                    ]
                case "medium":
                    return [
                        "- Allow multi-step reasoning (2–4 steps).",
                        "- Use light abstraction, but keep it grounded in an example.",
                        "- Distractors should be plausible misconceptions.",
                        "- Explanations should be concise but explicitly justify why each choice is right/wrong.",
                    ]
                case "hard":
                    return [
                        "- Allow more complex reasoning and careful reading.",
                        "- You may use abstraction, but keep it educational and not overly technical.",
                        "- Make distractors subtly wrong in different ways (conceptual, factual, or logic error).",
                        "- Explanations should mention the key principle or rule that decides it.",
                    ]
                case "impossible":
                    return [
                        "- Use age-appropriate vocabulary, but require careful synthesis or evaluation (one clear idea only).",
                        "- Allow 4–6 reasoning steps; keep them inferable from the stem/context (no outside trivia dependency).",
                        "- Distractors must be extremely plausible and each wrong for a different subtle reason.",
                        "- Explanations must pinpoint the exact flaw in each distractor and cite the deciding principle.",
                    ]

        # High School (grades-9-12)
        case "grades-9-12":
            match d:
                case "easy":
                    return [
                        "- Keep it approachable: straightforward wording and direct question stems.",
                        "- 1–2 step reasoning; no trick questions.",
                        "- Define any technical term briefly if introduced.",
                        "- Focus on core concepts, not edge-case trivia.",
                    ]
                case "medium":
                    return [
                        "- Allow 2–4 step reasoning and light technical vocabulary.",
                        "- Prefer application/analysis over memorization.",
                        "- Distractors should be realistic misunderstandings.",
                        "- Explanations should be concise and principle-based.",
                    ]
                case "hard":
                    return [
                        "- Allow deeper reasoning, synthesis, or evaluation (still one clear idea per question).",
                        "- Use precise language; you may include more advanced terms with brief definitions.",
                        "- Make distractors close-but-wrong, each wrong for a different reason.",
                        "- Explanations should identify the governing concept and the specific mistake in wrong choices.",
                    ]
                case "impossible":
                    return [
                        "- Require advanced reasoning and precision, but keep it PG and educational.",
                        "- Use one concept, but make distractors very close to correct (scope/definition boundary/hidden assumption).",
                        "- Prefer synthesis, counterexample thinking, or eliminating near-correct distractors over trivia.",
                        "- Explanations must identify the key principle and the exact assumption/error that breaks each wrong choice.",
                    ]

        case _:
            return []
