import fs from 'node:fs/promises';
import path from 'node:path';
import slug from 'slug';
import type { Location } from 'esbuild';
import { walk } from 'estree-walker-ts';
import { getBuildExtensions } from 'esbuild-extra';

type Message = {
  key: string;
  default: string;
  file: string;
  loc: Location;
};

const messages: Message[] = [];

function buildKey(filePath: string, text: string) {
  const base = path.basename(filePath, path.extname(filePath));
  return `${base}_${slug(text)}`;
}

function recordMessage(key: string, def: string, file: string, loc: Location) {
  if (messages.some(m => m.key === key)) return;
  messages.push({ key, default: def, file, loc });
}

export const nogodeyPlugin = {
  name: 'nogodey-ast',
  setup(build: any) {
    const { onTransform } = getBuildExtensions(build, 'nogodey-ast');

    onTransform({ filter: /\.(tsx?|jsx?)$/ }, (args: any): any => {
      const { ast, path: filePath } = args;

      walk(ast, {
        enter(node: any) {
          // handle <Text>nogodey</Text>
          if (node.type === 'JSXElement') {
            const openingElement = node.openingElement;
            const nameNode = openingElement?.name;
            const tagName = (nameNode?.type === 'JSXIdentifier' ? nameNode.name : '').toLowerCase();
            
            if (tagName === 'text') {
              node.children?.forEach((child: any, idx: number) => {
                if (child.type === 'JSXText' && child.value?.trim()) {
                  const txt = child.value.trim();
                  const key = buildKey(filePath, txt);
                  const loc = child.loc || { line: 0, column: 0 };
                  recordMessage(key, txt, filePath, loc);
                  node.children[idx] = {
                    type: 'JSXExpressionContainer',
                    expression: {
                      type: 'CallExpression',
                      callee: { type: 'Identifier', name: '__NOGO__' },
                      arguments: [{ type: 'Literal', value: key, raw: `"${key}"` }],
                      optional: false,
                    },
                  };
                }
              });
            }
          }

          // handle attributes
          if (
            node.type === 'JSXAttribute' &&
            node.name?.type === 'JSXIdentifier' &&
            ['placeholder', 'label', 'title'].includes(node.name.name) &&
            node.value?.type === 'Literal'
          ) {
            const txt = String(node.value.value);
            if (txt) {
              const key = buildKey(filePath, txt);
              const loc = node.loc || { line: 0, column: 0 };
              recordMessage(key, txt, filePath, loc);
              node.value = {
                type: 'JSXExpressionContainer',
                expression: {
                  type: 'CallExpression',
                  callee: { type: 'Identifier', name: '__NOGO__' },
                  arguments: [{ type: 'Literal', value: key, raw: `"${key}"` }],
                  optional: false,
                },
              };
            }
          }
        }
      });

      return { ast };
    });

    build.onEnd(async () => {
      await fs.writeFile('messages.json', JSON.stringify(messages, null, 2));
      console.log(`Extracted ${messages.length} messages → messages.json`);
    });
  },
};

// CLI helper: allow `node plugin.js --build`
if (process.argv.includes('--build')) {
  const { build: esbuild } = await import('esbuild');
  const { wrapPlugins } = await import('esbuild-extra');
  esbuild(
    wrapPlugins({
      entryPoints: ['src/index.tsx'],
      bundle: true,
      outfile: 'bundle.js',
      plugins: [nogodeyPlugin],
      format: 'esm',
    }),
  ).catch(() => process.exit(1));
}
