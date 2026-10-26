interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Server-rendered schema.org structured data. `<` is escaped so no value can
 * close the script element early (the pattern the Next.js JSON-LD guide uses).
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
