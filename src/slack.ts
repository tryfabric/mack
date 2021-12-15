import type {
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  SectionBlock,
} from '@slack/types';

const MAX_TEXT_LENGTH = 3000;
const MAX_HEADER_LENGTH = 150;
const MAX_IMAGE_TITLE_LENGTH = 2000;
const MAX_IMAGE_ALT_TEXT_LENGTH = 2000;

export function section(text: string): SectionBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: text.slice(0, MAX_TEXT_LENGTH),
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
      text: text.slice(0, MAX_HEADER_LENGTH),
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
    alt_text: altText.slice(0, MAX_IMAGE_ALT_TEXT_LENGTH),
    title: title
      ? {
          type: 'plain_text',
          text: title.slice(0, MAX_IMAGE_TITLE_LENGTH),
        }
      : undefined,
  };
}
