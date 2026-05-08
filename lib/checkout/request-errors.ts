import { ZodError } from "zod";
import { suggestEmailTypo } from "@/lib/email-validation";

export function checkoutValidationErrorBody(parsedError: ZodError, rawJson: unknown) {
  const issue = parsedError.issues[0];
  const email = typeof (rawJson as { customerEmail?: unknown } | null)?.customerEmail === "string"
    ? ((rawJson as { customerEmail: string }).customerEmail)
    : "";
  const suggestion = email ? suggestEmailTypo(email) : null;
  return {
    error: issue?.message || "Invalid checkout data",
    ...(suggestion ? { emailSuggestion: suggestion } : {}),
  };
}
