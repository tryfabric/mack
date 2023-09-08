import type {KnownBlock} from '@slack/types';
import {parseBlocks} from './parser/internal';
import type {ParsingOptions} from './types';
import {marked} from 'marked';

/**
 * Parses Markdown content into Slack BlockKit Blocks.
 * - Supports headings (all Markdown heading levels are treated as the single Slack header block)
 * - Supports numbered lists, bulleted lists, to-do lists
 * - Supports italics, bold, strikethrough, inline code, hyperlinks
 * - Supports images
 * - Supports thematic breaks / dividers
 *
 * Per Slack limitations, these markdown attributes are not completely supported:
 * - Tables: they will be copied but Slack will render them as text
 * - Block quotes (limited functionality; does not support lists, headings, or images within the block quote)
 *
 * Supports GitHub-flavoured Markdown.
 *
 * @param body any Markdown or GFM content
 * @param options options to configure the parser
 */
export async function markdownToBlocks(
  body: string,
  options: ParsingOptions = {}
): Promise<KnownBlock[]> {
  // Slack only wants &, <, and > escaped
  // https://api.slack.com/reference/surfaces/formatting#escaping
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };

  const lexer = new marked.Lexer();
  lexer.options.tokenizer = new marked.Tokenizer();
  lexer.options.tokenizer.inlineText = src => {
    const text = src.replace(/[&<>]/g, char => {
      return replacements[char];
    });

    return {
      type: 'text',
      raw: src,
      text: text,
    };
  };

  const tokens = lexer.lex(body);

  return parseBlocks(tokens, options);
}
