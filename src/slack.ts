import type {
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  SectionBlock,
} from '@slack/types';

export function section(text: string): SectionBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: text,
    },
  };
}

export function divider(): DividerBlock {
  return {
    type: 'divider',
  };
}

export function header(text: string): HeaderBlock {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text: text,
    },
  };
}

export function image(
  url: string,
  altText: string,
  title?: string
): ImageBlock {
  return {
    type: 'image',
    image_url: url,
    alt_text: altText,
    title: title
      ? {
          type: 'plain_text',
          text: title,
        }
      : undefined,
  };
}
