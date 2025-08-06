import bcrypt from 'bcrypt';

//암호화
export async function encrypt(rawText: string): Promise<string> {
  const saltOrRounds = 10;
  return await bcrypt.hash(rawText, saltOrRounds);
}

//암호문과 대조
export async function isHashValid(
  rawText: string,
  hashedText: string,
): Promise<boolean> {
  return await bcrypt.compare(rawText, hashedText);
}
