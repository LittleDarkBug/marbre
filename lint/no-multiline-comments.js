const isDirective = (text) => /^\s*(eslint|@ts-|global\s|istanbul|prettier)/.test(text)

export default {
  meta: {
    type: 'suggestion',
    messages: {
      block: 'Commentaire sur plusieurs lignes ou JSDoc interdit : une seule ligne, et seulement si nécessaire.',
      run: 'Suite de commentaires interdite : une seule ligne, et seulement si nécessaire.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const comments = context.sourceCode.getAllComments().filter((c) => !isDirective(c.value))
        let previous = null
        for (const c of comments) {
          if (c.type === 'Block' && (c.loc.start.line !== c.loc.end.line || c.value.startsWith('*'))) {
            context.report({ loc: c.loc, messageId: 'block' })
          }
          if (c.type === 'Line' && previous?.type === 'Line' && previous.loc.end.line === c.loc.start.line - 1) {
            context.report({ loc: c.loc, messageId: 'run' })
          }
          previous = c
        }
      },
    }
  },
}
