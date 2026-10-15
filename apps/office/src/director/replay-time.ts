export function ulidAt(ms: number): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let prefix = "";
  for (let i = 0; i < 10; i++) {
    prefix = alphabet[ms % 32] + prefix;
    ms = Math.floor(ms / 32);
  }
  return `${prefix}0000000000000000`;
}
