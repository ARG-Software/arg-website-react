export async function listOutreachRecords({ outreachRepository }) {
  return outreachRepository.list();
}
