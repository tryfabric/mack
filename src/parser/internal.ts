import * as md from '../markdown';
import {
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  KnownBlock,
  SectionBlock,
} from '@slack/types';
import {ListOptions, ParsingOptions} from '../types';

function parsePlainText(element: md.PhrasingContent): string[] {
  switch (element.type) {
    case 'linkReference':
    case 'link':
    case 'emphasis':
    case 'strong':
    case 'delete':
      return element.children.flatMap(parsePlainText);

    case 'break':
    case 'imageReference':
      return [];

    case 'image':
      return [element.title ?? element.url];

    case 'inlineCode':
    case 'text':
    case 'html':
      return [element.value];
  }
}

function isSectionBlock(block: KnownBlock): block is SectionBlock {
  return block.type === 'section';
}

function parseMrkdwn(element: Exclude<md.PhrasingContent, md.Image>): string {
  switch (element.type) {
    case 'link': {
      return `<${element.url}|${element.children
        .flatMap(parseMrkdwn)
        .join('')}> `;
    }

    case 'emphasis': {
      return `_${element.children.flatMap(parseMrkdwn).join('')}_`;
    }

    case 'inlineCode':
      return `\`${element.value}\``;

    case 'strong': {
      return `*${element.children.flatMap(parseMrkdwn).join('')}*`;
    }

    case 'text':
      return element.value;

    case 'delete': {
      return `~${element.children.flatMap(parseMrkdwn).join('')}~`;
    }

    default:
      return '';
  }
}

function addMrkdwn(
  content: string,
  accumulator: (SectionBlock | ImageBlock)[],
  prefix: string
) {
  const last = accumulator[accumulator.length - 1];

  if (last && isSectionBlock(last) && last.text) {
    last.text.text += content;
  } else {
    accumulator.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${prefix}${content}`,
      },
    });
  }
}

function parsePhrasingContentToStrings(
  element: md.PhrasingContent,
  accumulator: String[]
) {
  if (element.type === 'image') {
    accumulator.push(element.url ?? element.title ?? element.alt ?? 'image');
  } else {
    const text = parseMrkdwn(element);
    accumulator.push(text);
  }
}

function parsePhrasingContent(
  element: md.PhrasingContent,
  accumulator: (SectionBlock | ImageBlock)[],
  prefix = ''
) {
  if (element.type === 'image') {
    const image: ImageBlock = {
      type: 'image',
      image_url: element.url,
      title: element.title
        ? {
            type: 'plain_text',
            text: element.title,
          }
        : undefined,
      alt_text: element.alt ?? element.title ?? element.url,
    };

    accumulator.push(image);
  } else {
    const text = parseMrkdwn(element);
    addMrkdwn(text, accumulator, prefix);
  }
}

function parseParagraph(element: md.Paragraph, prefix = ''): KnownBlock[] {
  return element.children.reduce((accumulator, child) => {
    parsePhrasingContent(child, accumulator, prefix);
    return accumulator;
  }, [] as (SectionBlock | ImageBlock)[]);
}

function parseHeading(element: md.Heading): HeaderBlock {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text: element.children.flatMap(parsePlainText).join(''),
    },
  };
}

function parseCode(element: md.Code): SectionBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `\`\`\`${element.lang}\n${element.value}\n\`\`\``,
    },
  };
}

function parseList(element: md.List, options: ListOptions = {}): SectionBlock {
  let index = 0;
  const contents = element.children.flatMap(item => {
    const paragraph = item.children[0];
    if (paragraph.type !== 'paragraph') {
      return '';
    }

    const text = paragraph.children
      .filter(
        (child): child is Exclude<md.PhrasingContent, md.Image> =>
          child.type !== 'image'
      )
      .flatMap(parseMrkdwn)
      .join('');

    if (element.start !== null && element.start !== undefined) {
      index += 1;
      return `${index}. ${text}`;
    } else if (item.checked !== null && item.checked !== undefined) {
      return `${options.checkboxPrefix?.(item.checked) ?? '•'}${text}`;
    } else {
      return `• ${text}`;
    }
  });

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: contents.join('\n'),
    },
  };
}

function combineBetweenPipes(texts: String[]): String {
  return `| ${texts.join(' | ')} |`;
}

function parseTableRows(rows: md.TableRow[]): String[] {
  const parsedRows: String[] = [];
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

function parseTableRow(row: md.TableRow): String[] {
  const parsedCells: String[] = [];
  row.children.forEach(cell => {
    parsedCells.push(parseTableCell(cell));
  });
  return parsedCells;
}

function parseTableCell(cell: md.TableCell): String {
  const texts = cell.children.reduce(
    (accumulator: String[], child: md.PhrasingContent) => {
      parsePhrasingContentToStrings(child, accumulator);
      return accumulator;
    },
    [] as String[]
  );
  return texts.join(' ');
}

function parseTable(element: md.Table): SectionBlock {
  const parsedRows = parseTableRows(element.children);

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `\`\`\`\n${parsedRows.join('\n')}\n\`\`\``,
    },
  };
}

function parseBlockquote(node: md.Blockquote): KnownBlock[] {
  return node.children
    .filter((child): child is md.Paragraph => child.type === 'paragraph')
    .flatMap(p => parseParagraph(p, '> '));
}

function parseThematicBreak(): DividerBlock {
  return {
    type: 'divider',
  };
}

function parseNode(
  node: md.FlowContent,
  options: ParsingOptions
): KnownBlock[] {
  switch (node.type) {
    case 'heading':
      return [parseHeading(node)];

    case 'paragraph':
      return parseParagraph(node);

    case 'code':
      return [parseCode(node)];

    case 'blockquote':
      return parseBlockquote(node);

    case 'list':
      return [parseList(node, options.lists)];

    case 'table':
      return [parseTable(node)];

    case 'thematicBreak':
      return [parseThematicBreak()];

    default:
      return [];
  }
}

export function parseBlocks(
  root: md.Root,
  options: ParsingOptions = {}
): KnownBlock[] {
  return root.children.flatMap(node => parseNode(node, options));
}
