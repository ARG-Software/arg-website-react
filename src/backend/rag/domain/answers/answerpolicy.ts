export function normalizeAssistantAnswer(answer: string): string {
  return normalizeTeamVoice(
    answer
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

const TEAM_VOICE_VERBS: Record<string, string> = {
  was: 'were',
  is: 'are',
  has: 'have',
  does: 'do',
  started: 'started',
  began: 'began',
  appears: 'appear',
  offers: 'offer',
  provides: 'provide',
  builds: 'build',
  develops: 'develop',
  helps: 'help',
  works: 'work',
  focuses: 'focus',
  collaborates: 'collaborate',
};

// "ARG is" becomes "we are", but not after a preposition: "every role at ARG is remote" stays as written
function normalizeTeamVoice(answer: string): string {
  return answer.replace(
    /(\b(?:about|at|by|for|from|in|into|join|joining|of|on|than|to|with)\s+)?\bARG(?: Software)? (was|is|has|does|started|began|appears|offers|provides|builds|develops|helps|works|focuses|collaborates)\b/gi,
    (match, preposition: string | undefined, verb: string) =>
      preposition ? match : `we ${TEAM_VOICE_VERBS[verb.toLowerCase()]}`
  );
}
