import bcrypt from 'bcrypt';

// 암호화
export const encrypt = async (rawText: string): Promise<string> => {
  const saltOrRounds = 10;
  return await bcrypt.hash(rawText, saltOrRounds);
};

// 암호문과 대조
export const isHashValid = async (
  rawText: string,
  hashedText: string,
): Promise<boolean> => {
  return await bcrypt.compare(rawText, hashedText);
};
