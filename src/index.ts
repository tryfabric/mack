import unified from 'unified';
import markdown from 'remark-parse';
import gfm from 'remark-gfm';
import type {KnownBlock} from '@slack/types';
import TurndownService from 'turndown';
import remark2rehype from 'remark-rehype';
import html from 'rehype-stringify';
import raw from 'rehype-raw';
import {parseBlocks} from './parser/internal';
import type {Root} from './markdown';
import type {ParsingOptions} from './types';
const {gfm: turndownGfm} = require('turndown-plugin-gfm');

/**
 * Parses Markdown content into Slack BlockKit Blocks.
 * - Supports headings (all Markdown heading levels are treated as the single Slack header block)
 * - Supports numbered lists, bulleted lists, to-do lists
 * - Supports italics, bold, strikethrough, inline code, hyperlinks
 * - Supports images
 * - Supports thematic breaks / dividers
 *
 * Per Slack limitations, these markdown attributes are not supported:
 * - Tables (removed)
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
  // TODO: Make this more efficient by using less intermediary parsers

  const turndownService = new TurndownService().use(turndownGfm);

  const rawHtml = await unified()
    .use(markdown)
    .use(gfm)
    .use(remark2rehype, {allowDangerousHtml: true})
    .use(raw)
    .use(html)
    .process(body);

  const rawMarkdown = turndownService.turndown(String(rawHtml));

  const root = unified().use(markdown).use(gfm).parse(rawMarkdown);

  return parseBlocks(root as unknown as Root, options);
}
