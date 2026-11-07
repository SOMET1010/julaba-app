/** Attend la fin de la parole; un rejet n'autorise jamais la suite du geste. */
export async function paroleConfirmationTerminee(parler: () => void | Promise<void>): Promise<boolean> {
  try {
    await parler();
    return true;
  } catch {
    return false;
  }
}
