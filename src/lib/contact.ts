import config from "../../data/config.json";

export function correctionsEmail(): string {
  return config.contact.corrections_email;
}

/** Prefill a mailto with a useful subject line. */
export function correctionsMailto(opts?: {
  siteName?: string;
  kind?: "correction" | "right-of-reply" | "new-site";
}): string {
  const kind = opts?.kind ?? "correction";
  const subject =
    kind === "right-of-reply"
      ? "Yorkshire Compute Belt: right of reply"
      : kind === "new-site"
        ? "Yorkshire Compute Belt: new site"
        : opts?.siteName
          ? `Yorkshire Compute Belt: correction (${opts.siteName})`
          : "Yorkshire Compute Belt: correction";
  const body =
    kind === "right-of-reply"
      ? "Site or claim you are responding to:\n\nYour response (verbatim publication):\n\n"
      : "Site:\nWhat should change:\nEvidence (document + page if possible):\n\n";
  const q = new URLSearchParams({ subject, body });
  return `mailto:${correctionsEmail()}?${q.toString()}`;
}
