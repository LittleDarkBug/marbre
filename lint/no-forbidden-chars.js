const FORBIDDEN = /—|\p{Extended_Pictographic}/u

export default {
  meta: {
    type: 'problem',
    messages: { char: 'Tiret cadratin ou emoji interdit dans le texte.' },
    schema: [],
  },
  create(context) {
    const check = (node, value) => {
      if (typeof value === 'string' && FORBIDDEN.test(value)) context.report({ node, messageId: 'char' })
    }
    return {
      Literal: (node) => check(node, node.value),
      TemplateElement: (node) => check(node, node.value.cooked),
      JSXText: (node) => check(node, node.value),
    }
  },
}
