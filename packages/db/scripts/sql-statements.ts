// Split a migration without splitting PL/pgSQL bodies, comments or quoted values.
export function sqlStatements(source: string) {
  const statements: string[] = [];
  let start = 0;
  let quote = "";
  let comment = "";
  for (let i = 0; i < source.length; i++) {
    if (comment === "--") {
      if (source[i] === "\n") comment = "";
      continue;
    }
    if (comment === "/*") {
      if (source.slice(i, i + 2) === "*/") {
        comment = "";
        i++;
      }
      continue;
    }
    if (quote) {
      if (source.startsWith(quote, i)) {
        if ((quote === "'" || quote === '"') && source[i + 1] === quote) {
          i++;
          continue;
        }
        i += quote.length - 1;
        quote = "";
      }
      continue;
    }
    if (source.slice(i, i + 2) === "--" || source.slice(i, i + 2) === "/*") {
      comment = source.slice(i, i + 2);
      i++;
      continue;
    }
    if (source[i] === "'" || source[i] === '"') {
      quote = source[i]!;
      continue;
    }
    const dollar = source.slice(i).match(/^\$(?:[a-zA-Z_][\w]*)?\$/)?.[0];
    if (dollar) {
      quote = dollar;
      i += dollar.length - 1;
      continue;
    }
    if (source[i] === ";") {
      statements.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (source.slice(start).trim()) statements.push(source.slice(start).trim());
  return statements.filter((s) => !/^(?:--[^\n]*\n\s*)*(?:BEGIN|COMMIT);?$/i.test(s));
}
