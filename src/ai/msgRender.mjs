import { marked } from 'marked';

/**
 * @param {string} msg
 */
export const makeMsgRenderer = (msg) => {
  const renderer = new marked.Renderer();
  const final = '<span class="final-ai-icon">';
  // | █ ▌▐ _

  // Remove links and html
  renderer.link = (href, title, text) => `<span>${text}</span>`;
  renderer.image = () => ``;
  renderer.html = (data) => {
    if (data.raw !== final || data.text !== final) return ``;
    else return `${final}█</span>`;
  };

  // Fix del
  renderer.del = function (data) {
    if (data.raw.startsWith('~') && data.raw.endsWith('~') && !data.raw.startsWith('~~')) {
      return data.raw;
    }
    return `<del>${data.text}</del>`;
  };

  // Complete
  let newMsg = `${msg}`;
  while (newMsg.endsWith('\n')) {
    newMsg = newMsg.slice(0, -1);
  }

  while (newMsg.startsWith('\n')) {
    newMsg = newMsg.slice(1);
  }

  return marked.parse(`${newMsg}${final}`.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ''), {
    renderer: renderer,
    breaks: true,
  });
};
