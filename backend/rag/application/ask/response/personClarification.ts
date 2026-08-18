export function createPersonClarification(responseLanguage: string): string {
  if (responseLanguage.toLowerCase().startsWith('pt')) {
    return 'De quem está a falar? Diga-me o nome da pessoa para eu poder verificar a nossa informação pública.';
  }

  if (responseLanguage.toLowerCase().startsWith('es')) {
    return '¿De quién hablas? Dime el nombre de la persona para que pueda comprobar nuestra información pública.';
  }

  return 'Who do you mean? Please tell me the person’s name so I can check our public information.';
}
