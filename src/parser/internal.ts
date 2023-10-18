import {
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  KnownBlock,
  SectionBlock,
} from '@slack/types';
import {ListOptions, ParsingOptions} from '../types';
import {section, divider, header, image} from '../slack';
import {Token, Tokens, TokensList} from 'marked';
import {XMLParser} from 'fast-xml-parser';

type PhrasingToken =
  | Tokens.Link
  | Tokens.Em
  | Tokens.Strong
  | Tokens.Del
  | Tokens.Br
  | Tokens.Image
  | Tokens.Codespan
  | Tokens.Text
  | Tokens.HTML;

function parsePlainText(element: PhrasingToken): string[] {
  switch (element.type) {
    case 'link':
    case 'em':
    case 'strong':
    case 'del':
      return element.tokens.flatMap(child =>
        parsePlainText(child as PhrasingToken)
      );

    case 'br':
      return [];

    case 'image':
      return [element.title ?? element.href];

    case 'codespan':
    case 'text':
    case 'html':
      return [element.raw];
  }
}

function isSectionBlock(block: KnownBlock): block is SectionBlock {
  return block.type === 'section';
}

function parseMrkdwn(element: Exclude<PhrasingToken, Tokens.Image>): string {
  switch (element.type) {
    case 'link': {
      return `<${element.href}|${element.tokens
        .flatMap(child => parseMrkdwn(child as typeof element))
        .join('')}> `;
    }

    case 'em': {
      return `_${element.tokens
        .flatMap(child => parseMrkdwn(child as typeof element))
        .join('')}_`;
    }

    case 'codespan':
      return `${element.raw}`;

    case 'strong': {
      return `*${element.tokens
        .flatMap(child => parseMrkdwn(child as typeof element))
        .join('')}*`;
    }

    case 'text':
      return element.text;

    case 'del': {
      return `~${element.tokens
        .flatMap(child => parseMrkdwn(child as typeof element))
        .join('')}~`;
    }

    default:
      return '';
  }
}

function addMrkdwn(
  content: string,
  accumulator: (SectionBlock | ImageBlock)[]
) {
  const last = accumulator[accumulator.length - 1];

  if (last && isSectionBlock(last) && last.text) {
    last.text.text += content;
  } else {
    accumulator.push(section(content));
  }
}

function parsePhrasingContentToStrings(
  element: PhrasingToken,
  accumulator: string[]
) {
  if (element.type === 'image') {
    accumulator.push(element.href ?? element.title ?? element.text ?? 'image');
  } else {
    const text = parseMrkdwn(element);
    accumulator.push(text);
  }
}

function parsePhrasingContent(
  element: PhrasingToken,
  accumulator: (SectionBlock | ImageBlock)[]
) {
  if (element.type === 'image') {
    const imageBlock: ImageBlock = image(
      element.href,
      element.text || element.title || element.href,
      element.title || ''
    );
    accumulator.push(imageBlock);
  } else {
    const text = parseMrkdwn(element);
    addMrkdwn(text, accumulator);
  }
}

function parseParagraph(
  element: Tokens.Paragraph | Tokens.Generic
): KnownBlock[] {
  return element.tokens
    ? element.tokens.reduce((accumulator, child) => {
        parsePhrasingContent(child as PhrasingToken, accumulator);
        return accumulator;
      }, [] as (SectionBlock | ImageBlock)[])
    : [];
}

function parseHeading(element: Tokens.Heading | Tokens.Generic): HeaderBlock {
  return element.tokens
    ? header(
        element.tokens
          .flatMap(child => parsePlainText(child as PhrasingToken))
          .join('')
      )
    : header('');
}

function parseCode(element: Tokens.Code | Tokens.Generic): SectionBlock {
  return section(`\`\`\`\n${element.text}\n\`\`\``);
}

function parseList(
  element: Tokens.List | Tokens.Generic,
  options: ListOptions = {}
): SectionBlock {
  let index = 0;
  const contents = element.items.map((item: Tokens.ListItem) => {
    const paragraph = item.tokens[0] as Tokens.Text;
    if (!paragraph || paragraph.type !== 'text' || !paragraph.tokens?.length) {
      return paragraph?.text || '';
    }

    const text = paragraph.tokens
      .filter(
        (child): child is Exclude<PhrasingToken, Tokens.Image> =>
          child.type !== 'image'
      )
      .flatMap(parseMrkdwn)
      .join('');

    if (element.ordered) {
      index += 1;
      return `${index}. ${text}`;
    } else if (item.checked !== null && item.checked !== undefined) {
      return `${options.checkboxPrefix?.(item.checked) ?? '• '}${text}`;
    } else {
      return `• ${text}`;
    }
  });

  return section(contents.join('\n'));
}

function combineBetweenPipes(texts: String[]): string {
  return `| ${texts.join(' | ')} |`;
}

function parseTableRows(rows: Tokens.TableCell[][]): string[] {
  const parsedRows: string[] = [];
  rows.forEach((row, index) => {
    const parsedCells = parseTableRow(row);
    if (index === 1) {
      const headerRowArray = new Array(parsedCells.length).fill('---');
      const headerRow = combineBetweenPipes(headerRowArray);
      parsedRows.push(headerRow);
    }
    parsedRows.push(combineBetweenPipes(parsedCells));
  });
  return parsedRows;
}

function parseTableRow(row: Tokens.TableCell[]): String[] {
  const parsedCells: String[] = [];
  row.forEach(cell => {
    parsedCells.push(parseTableCell(cell));
  });
  return parsedCells;
}

function parseTableCell(cell: Tokens.TableCell): String {
  const texts = cell.tokens.reduce((accumulator, child) => {
    parsePhrasingContentToStrings(child as PhrasingToken, accumulator);
    return accumulator;
  }, [] as string[]);
  return texts.join(' ');
}

function parseTable(element: Tokens.Table | Tokens.Generic): SectionBlock {
  const parsedRows = parseTableRows([element.header, ...element.rows]);

  return section(`\`\`\`\n${parsedRows.join('\n')}\n\`\`\``);
}

function parseBlockquote(
  element: Tokens.Blockquote | Tokens.Generic
): KnownBlock[] {
  return element.tokens
    ? element.tokens
        .filter(
          (child): child is Tokens.Paragraph => child.type === 'paragraph'
        )
        .flatMap(p =>
          parseParagraph(p).map(block => {
            if (isSectionBlock(block) && block.text?.text?.includes('\n'))
              block.text.text = '> ' + block.text.text.replace(/\n/g, '\n> ');
            return block;
          })
        )
    : [];
}

function parseThematicBreak(): DividerBlock {
  return divider();
}

function parseHTML(
  element: Tokens.HTML | Tokens.Tag | Tokens.Generic
): KnownBlock[] {
  const parser = new XMLParser({ignoreAttributes: false});
  const res = parser.parse(element.raw);

  if (res.img) {
    const tags = res.img instanceof Array ? res.img : [res.img];

    return tags
      .map((img: Record<string, string>) => {
        const url: string = img['@_src'];
        return image(url, img['@_alt'] || url);
      })
      .filter((e: Record<string, string>) => !!e);
  } else return [];
}

function parseToken(token: Token, options: ParsingOptions): KnownBlock[] {
  switch (token.type) {
    case 'heading':
      return [parseHeading(token)];

    case 'paragraph':
      return parseParagraph(token);

    case 'code':
      return [parseCode(token)];

    case 'blockquote':
      return parseBlockquote(token);

    case 'list':
      return [parseList(token, options.lists)];

    case 'table':
      return [parseTable(token)];

    case 'hr':
      return [parseThematicBreak()];

    case 'html':
      return parseHTML(token);

    default:
      return [];
  }
}

export function parseBlocks(
  tokens: TokensList,
  options: ParsingOptions = {}
): KnownBlock[] {
  return tokens.flatMap(token => {
    const parsed = parseToken(token, options);
    return parsed;
  });
}
