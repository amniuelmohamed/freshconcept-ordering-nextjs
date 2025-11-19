import type { Locale } from "./routing";

type Messages = typeof import("../messages/en.json");

export async function getMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "fr":
      return (await import("../messages/fr.json")).default;
    case "nl":
      return (await import("../messages/nl.json")).default;
    case "en":
      return (await import("../messages/en.json")).default;
    default: {
      const exhaustiveCheck: never = locale;
      throw new Error(`Unsupported locale: ${exhaustiveCheck}`);
    }
  }
}

