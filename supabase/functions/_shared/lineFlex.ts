// Shared LINE Flex Message building blocks -- used by both line-webhook
// (bot replies) and line-push-notify (server-pushed timeline updates), so
// the two functions don't grow two slightly-different card layouts over
// time. No hero photo: LINE's Flex `image` component needs a hosted JPEG/PNG
// (this repo only has SVG favicons), so these are photo-less cards -- a
// colored header bar standing in for the imagery instead.

export interface FlexButtonAction {
  label: string
  /** Opens a URL (e.g. the case tracking page) -- mutually exclusive with `text`. */
  uri?: string
  /** Sends this text as if the user typed it (reuses the bot's own text
   * command handling, e.g. "แจ้งเหตุ") -- mutually exclusive with `uri`. */
  text?: string
}

export interface FlexCardOptions {
  headerText: string
  headerColor: string
  title: string
  bodyLines: string[]
  buttons: FlexButtonAction[]
}

// deno-lint-ignore no-explicit-any
export function buildFlexCard(opts: FlexCardOptions): Record<string, any> {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: opts.headerColor,
      paddingAll: '16px',
      contents: [
        { type: 'text', text: opts.headerText, color: '#FFFFFF', weight: 'bold', size: 'sm' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '20px',
      contents: [
        { type: 'text', text: opts.title, weight: 'bold', size: 'lg', wrap: true, color: '#12304A' },
        ...opts.bodyLines.map((line) => ({ type: 'text', text: line, size: 'sm', wrap: true, color: '#5B6B7C' })),
      ],
    },
    footer:
      opts.buttons.length === 0
        ? undefined
        : {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            paddingAll: '12px',
            contents: opts.buttons.map((btn, i) => ({
              type: 'button',
              style: i === 0 ? 'primary' : 'secondary',
              color: i === 0 ? opts.headerColor : undefined,
              height: 'sm',
              action: btn.uri
                ? { type: 'uri', label: btn.label, uri: btn.uri }
                : { type: 'message', label: btn.label, text: btn.text ?? btn.label },
            })),
          },
  }
}

// deno-lint-ignore no-explicit-any
export function flexMessage(altText: string, bubble: Record<string, any>) {
  return { type: 'flex', altText, contents: bubble }
}
