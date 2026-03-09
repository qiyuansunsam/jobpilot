import { config } from '../config';
import { GenerateRequest } from '../types';

const PROXY_BASE = config.claudeProxyUrl; // http://127.0.0.1:3456

const SYSTEM_PROMPT = `You are JobPilot AI — a professional job application assistant. Your goal is to generate tailored, authentic, and compelling application content.

Rules:
- Be specific to the job description provided
- Use details from the candidate's CV and additional info naturally
- Never fabricate experience or skills the candidate doesn't have
- Write in a professional but personable tone
- Keep cover letters to 3-4 paragraphs
- For screening questions, give concise, relevant answers

Output Format:
- If generating a cover letter, output it under a "## Cover Letter" heading
- If generating screening answers, output them under a "## Screening Answers" heading with each Q&A pair
- Use markdown formatting`;

async function chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
  const res = await fetch(`${PROXY_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4',
      messages,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude proxy error (${res.status}): ${err}`);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generateContent(
  cvText: string,
  additionalInfo: string,
  preferences: { job_titles: string; locations: string; experience: string | null },
  request: GenerateRequest
): Promise<{ coverLetter: string | null; screeningAnswers: string | null; rawResponse: string }> {
  const userPrompt = buildUserPrompt(cvText, additionalInfo, preferences, request);

  const rawResponse = await chatCompletion([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  let coverLetter: string | null = null;
  let screeningAnswers: string | null = null;

  if (request.generateType === 'cover_letter' || request.generateType === 'both') {
    const coverMatch = rawResponse.match(/## Cover Letter\s*\n([\s\S]*?)(?=## Screening|$)/);
    coverLetter = coverMatch ? coverMatch[1].trim() : rawResponse;
  }

  if (request.generateType === 'screening_answers' || request.generateType === 'both') {
    const answersMatch = rawResponse.match(/## Screening Answers\s*\n([\s\S]*?)$/);
    screeningAnswers = answersMatch ? answersMatch[1].trim() : null;
  }

  return { coverLetter, screeningAnswers, rawResponse };
}

function buildUserPrompt(
  cvText: string,
  additionalInfo: string,
  preferences: { job_titles: string; locations: string; experience: string | null },
  request: GenerateRequest
): string {
  let prompt = `## Candidate CV\n${cvText || '(No CV uploaded yet)'}\n\n`;
  prompt += `## Additional Information\n${additionalInfo || '(None provided)'}\n\n`;
  prompt += `## Preferences\n- Target roles: ${preferences.job_titles || '[]'}\n- Locations: ${preferences.locations || '[]'}\n- Experience level: ${preferences.experience || 'Not specified'}\n\n`;
  prompt += `## Job Details\n`;
  if (request.jobTitle) prompt += `- Title: ${request.jobTitle}\n`;
  if (request.company) prompt += `- Company: ${request.company}\n`;
  prompt += `\n### Job Description\n${request.jobDescription}\n\n`;
  prompt += `## Task\nPlease generate: ${request.generateType.replace('_', ' ')}\n`;

  if (request.screeningQuestions?.length) {
    prompt += `\n### Screening Questions\n`;
    request.screeningQuestions.forEach((q, i) => {
      prompt += `${i + 1}. ${q}\n`;
    });
  }

  return prompt;
}
