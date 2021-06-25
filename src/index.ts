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

export async function markdownToBlocks(
  body: string,
  options: ParsingOptions = {}
): Promise<KnownBlock[]> {
  const turndownService = new TurndownService().use(turndownGfm);

  const root = await unified()
    .use(markdown)
    .use(gfm)
    .use(remark2rehype, {allowDangerousHtml: true})
    .use(raw)
    .use(html)
    .process(body);

  const a = turndownService.turndown(String(root));

  const root2 = unified().use(markdown).use(gfm).parse(a);

  // const root3 = unified().use(remarkUnwrapImages).run(root2);
  return parseBlocks(root2 as unknown as Root, options);
}
