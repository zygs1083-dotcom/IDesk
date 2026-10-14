import { customAlphabet } from "nanoid";
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
export const newId = customAlphabet(alphabet, 12);
export const newSecret = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 40);
