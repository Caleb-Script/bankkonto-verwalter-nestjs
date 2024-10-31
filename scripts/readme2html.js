import fs from 'node:fs'
import path from 'node:path';
import rehypeSlug from 'rehype-slug';
// Syntaxbaum (AST) "hast" in einen String konvertieren
import rehypeStringify from 'rehype-stringify'
// Markdown einlesen und in einen Syntaxbaum (AST) transformieren -> "mdast"
import remarkParse from 'remark-parse'
// Linter fuer Konsistenz in der Markdown-Datei
import remarkPresetLintConsistent from 'remark-preset-lint-consistent'
// Empfehlungen, u.a. keine Hersteller-spezifischen ("vendor") Features
import remarkPresetLintRecommended from 'remark-preset-lint-recommended'
// Style Guide fuer Markdown einhalten
import remarkPresetLintMarkdownStyleGuide from 'remark-preset-lint-markdown-style-guide'
// vom Markdown Ecosystem "remark" in das HTML Ecosystem "rehype" wechseln: "mdast" -> "hast"
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const filename = 'ReadMe';
// const filename = 'Installationsanleitung';
const readme = fs.readFileSync(`${filename}.md`).toString();

const htmlFile = await unified()
    .use(remarkParse)
    .use(remarkPresetLintConsistent)
    .use(remarkPresetLintRecommended)
    .use(remarkPresetLintMarkdownStyleGuide)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(readme);

fs.writeFileSync(
    path.join('.extras','doc', `${filename}.html`),
    String(htmlFile),
);
