// What a visitor types or pastes into the 6-digit sign-in code. Arabic-Indic and Persian digits become 0-9
// (an Arabic keyboard types ٣, not 3); everything else is dropped.
export const CODE_LENGTH = 6;
const DIGIT_ZEROS = [0x0660, 0x06f0]; // ٠ and ۰: each starts a run of ten digits

function asciiDigit(char) {
  if (char >= "0" && char <= "9") return char;
  const code = char.codePointAt(0);
  const zero = DIGIT_ZEROS.find((z) => code >= z && code < z + 10);
  return zero === undefined ? "" : String(code - zero);
}

/** Only the digits of text, as 0-9. */
export const digitsOf = (text) => Array.from(String(text), asciiDigit).join("");
