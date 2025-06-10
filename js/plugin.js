import fs from 'node:fs/promises';
import path from 'node:path';
import slug from 'slug';
import * as esbuild from 'esbuild';
import { getBuildExtensions } from 'esbuild-extra';

const messages = [];

function buildKey(filePath, text) {
  const base = path.basename(filePath, path.extname(filePath));
  return `${base}_${slug(text)}`;
}

function recordMessage(key, def, file, loc) {
  if (messages.some(m => m.key === key)) return;
  messages.push({ key, default: def, file, loc });
}

export const nogodeyPlugin = {
  name: 'nogodey-ast',
  setup(build) {
    const { onTransform } = getBuildExtensions(build, 'nogodey-ast');

    onTransform({ filter: /\.(tsx?|jsx?)$/ }, async ({ ast, path: filePath }) => {
      esbuild.walk(ast, node => {
        // handle <Text>foo</Text>
        if (node.type === 'JSXElement') {
          const tagName = node.openingElement.name.name?.toLowerCase?.() ?? '';
          if (tagName === 'text') {
            node.children.forEach((child, idx) => {
              if (child.type === 'JSXText' && child.value.trim()) {
                const txt = child.value.trim();
                const key = buildKey(filePath, txt);
                recordMessage(key, txt, filePath, child.loc);
                node.children[idx] = {
                  type: 'JSXExpressionContainer',
                  expression: {
                    type: 'CallExpression',
                    callee: { type: 'Identifier', name: '__NOGO__' },
                    arguments: [{ type: 'Literal', value: key, raw: `"${key}"` }],
                  },
                };
              }
            });
          }
        }

        // handle attributes
        if (
          node.type === 'JSXAttribute' &&
          ['placeholder', 'label', 'title'].includes(node.name.name) &&
          node.value?.type === 'Literal'
        ) {
          const txt = node.value.value;
          if (txt) {
            const key = buildKey(filePath, txt);
            recordMessage(key, txt, filePath, node.loc);
            node.value = {
              type: 'JSXExpressionContainer',
              expression: {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: '__NOGO__' },
                arguments: [{ type: 'Literal', value: key, raw: `"${key}"` }],
              },
            };
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