import { RuleTester } from 'eslint'
import { afterAll, describe, it } from 'vitest'
import noMultilineComments from './no-multiline-comments.js'
import noForbiddenChars from './no-forbidden-chars.js'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const DASH = String.fromCodePoint(0x2014)
const SMILE = String.fromCodePoint(0x1f600)

const tester = new RuleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } })

tester.run('no-multiline-comments', noMultilineComments, {
  valid: ['// une ligne\nconst a = 1', 'const a = 1 /* court */', '// eslint-disable-next-line\n// note\nconst a = 1'],
  invalid: [
    { code: '/**\n * doc\n */\nconst a = 1', errors: 1 },
    { code: '/* a\n b */\nconst a = 1', errors: 1 },
    { code: '/** doc */\nconst a = 1', errors: 1 },
    { code: '// un\n// deux\nconst a = 1', errors: 1 },
  ],
})

tester.run('no-forbidden-chars', noForbiddenChars, {
  valid: ["const a = 'texte - simple'", 'const b = <p>Bonjour</p>'],
  invalid: [
    { code: "const a = 'avant " + DASH + " apres'", errors: 1 },
    { code: 'const b = <p>Salut ' + SMILE + '</p>', errors: 1 },
    { code: 'const c = `x ' + DASH + ' y`', errors: 1 },
  ],
})
