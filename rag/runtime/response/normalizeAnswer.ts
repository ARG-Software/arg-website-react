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

function normalizeTeamVoice(answer: string): string {
  return answer
    .replace(/\bARG(?: Software)? was\b/gi, 'we were')
    .replace(/\bARG(?: Software)? is\b/gi, 'we are')
    .replace(/\bARG(?: Software)? has\b/gi, 'we have')
    .replace(/\bARG(?: Software)? does\b/gi, 'we do')
    .replace(/\bARG(?: Software)? started\b/gi, 'we started')
    .replace(/\bARG(?: Software)? began\b/gi, 'we began')
    .replace(/\bARG(?: Software)? appears\b/gi, 'we appear')
    .replace(/\bARG(?: Software)? offers\b/gi, 'we offer')
    .replace(/\bARG(?: Software)? provides\b/gi, 'we provide')
    .replace(/\bARG(?: Software)? builds\b/gi, 'we build')
    .replace(/\bARG(?: Software)? develops\b/gi, 'we develop')
    .replace(/\bARG(?: Software)? helps\b/gi, 'we help')
    .replace(/\bARG(?: Software)? works\b/gi, 'we work')
    .replace(/\bARG(?: Software)? focuses\b/gi, 'we focus')
    .replace(/\bARG(?: Software)? collaborates\b/gi, 'we collaborate');
}
