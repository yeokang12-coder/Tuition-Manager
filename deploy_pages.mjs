import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const GITHUB_OWNER = 'yeokang12-coder';
const GITHUB_REPO = 'Tuition-Manager';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const DIST_DIR = 'D:/ANTIGRAVITY PROJECT/RECEIPT MAKER/dist';
const TMP_BASE = 'D:/ANTIGRAVITY PROJECT/RECEIPT MAKER/.gh-pages-tmp';

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function deploy() {
  // 1. Ensure GitHub Pages serves from gh-pages branch (legacy mode) so it doesn't depend on workflow scope
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    'User-Agent': 'node',
    'Content-Type': 'application/json',
  };
  const pagesRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pages`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      build_type: 'legacy',
      source: { branch: 'gh-pages', path: '/' },
    }),
  });
  console.log('Pages PUT status:', pagesRes.status, await pagesRes.text());

  // 2. Stage dist/ into a clean temp repo and force-push to gh-pages
  if (fs.existsSync(TMP_BASE)) fs.rmSync(TMP_BASE, { recursive: true, force: true });
  const tmpDir = TMP_BASE;
  try {
    copyDirSync(DIST_DIR, tmpDir);
    // Add .nojekyll so GitHub Pages serves assets cleanly
    fs.writeFileSync(path.join(tmpDir, '.nojekyll'), '');

    await git.init({ fs, dir: tmpDir, defaultBranch: 'gh-pages' });
    await git.addRemote({
      fs,
      dir: tmpDir,
      remote: 'origin',
      url: `https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`,
    });

    function listFilesRel(dir, base = '') {
      let out = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.git') continue;
        const rel = base ? `${base}/${entry.name}` : entry.name;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          out = out.concat(listFilesRel(full, rel));
        } else {
          out.push(rel);
        }
      }
      return out;
    }

    for (const filepath of listFilesRel(tmpDir)) {
      await git.add({ fs, dir: tmpDir, filepath });
    }

    const sha = await git.commit({
      fs,
      dir: tmpDir,
      author: { name: 'yeokang12-coder', email: 'yeokang12@gmail.com' },
      message: `Deploy dist to gh-pages (${new Date().toISOString()})`,
    });
    console.log('gh-pages commit SHA:', sha);

    const pushRes = await git.push({
      fs,
      http,
      dir: tmpDir,
      remote: 'origin',
      ref: 'gh-pages',
      onAuth: () => ({ username: GITHUB_TOKEN }),
      force: true,
    });
    console.log('gh-pages push result:', JSON.stringify(pushRes));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

deploy().catch(err => {
  console.error(err);
  process.exit(1);
});
