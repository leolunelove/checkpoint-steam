#!/bin/zsh
cd "${0:A:h}" || exit 1
checkpoint_node="$(command -v node)"
if [[ -z "$checkpoint_node" ]]; then
  checkpoint_node="/Users/l/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$checkpoint_node" ]]; then
  print 'Node.js 22 or later is required. Install it, then run npm start in this folder.'
  read '?Press Enter to close.'
  exit 1
fi
print 'Open http://127.0.0.1:8787 in your browser. Keep this window open.'
"$checkpoint_node" --env-file-if-exists=.env server.mjs
if [[ $? -ne 0 ]]; then
  print 'The app could not start. If it is already running, open http://127.0.0.1:8787.'
  read '?Press Enter to close.'
fi
