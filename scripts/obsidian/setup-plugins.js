#!/usr/bin/env node
/**
 * Auto-download & install 9 community plugin Obsidian ke docs/vault/.obsidian/plugins/
 *
 * Usage:
 *   node scripts/obsidian/setup-plugins.js          # Install semua
 *   node scripts/obsidian/setup-plugins.js --update # Update existing
 *
 * Plugin di-download dari GitHub releases (latest stable).
 * Setelah selesai, buka Obsidian → plugin otomatis terdeteksi & aktif.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PLUGIN_DIR = path.resolve(__dirname, '../../docs/vault/.obsidian/plugins');

const PLUGINS = [
  { id: 'dataview', repo: 'blacksmithgu/obsidian-dataview', files: ['manifest.json', 'main.js', 'styles.css'] },
  { id: 'templater-obsidian', repo: 'SilentVoid13/Templater', files: ['manifest.json', 'main.js', 'styles.css'] },
  { id: 'calendar', repo: 'liamcain/obsidian-calendar-plugin', files: ['manifest.json', 'main.js', 'styles.css'] },
  { id: 'periodic-notes', repo: 'liamcain/obsidian-periodic-notes', files: ['manifest.json', 'main.js'] },
  { id: 'obsidian-kanban', repo: 'mgmeyers/obsidian-kanban', files: ['manifest.json', 'main.js', 'styles.css'] },
  { id: 'obsidian-excalidraw-plugin', repo: 'zsviczian/obsidian-excalidraw-plugin', files: ['manifest.json', 'main.js', 'styles.css'] },
  { id: 'obsidian-git', repo: 'Vinzent03/obsidian-git', files: ['manifest.json', 'main.js', 'styles.css'] },
  { id: 'obsidian-linter', repo: 'platers/obsidian-linter', files: ['manifest.json', 'main.js', 'styles.css'] },
  { id: 'obsidian-auto-link-title', repo: 'zolrath/obsidian-auto-link-title', files: ['manifest.json', 'main.js'] },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'JHB-Obsidian-Setup' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return resolve(fetchJson(res.headers.location));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse fail: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'JHB-Obsidian-Setup' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return resolve(fetchBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function installPlugin(plugin) {
  const dir = path.join(PLUGIN_DIR, plugin.id);
  fs.mkdirSync(dir, { recursive: true });

  // Get latest release
  const releaseUrl = `https://api.github.com/repos/${plugin.repo}/releases/latest`;
  const release = await fetchJson(releaseUrl);
  const version = release.tag_name || 'unknown';

  let downloaded = 0;
  for (const fname of plugin.files) {
    const asset = release.assets?.find((a) => a.name === fname);
    if (!asset) {
      // styles.css optional, skip silently
      if (fname === 'styles.css') continue;
      console.log(`  ⚠ ${fname} not found in release`);
      continue;
    }
    try {
      const buf = await fetchBuffer(asset.browser_download_url);
      fs.writeFileSync(path.join(dir, fname), buf);
      downloaded++;
    } catch (e) {
      console.log(`  ✗ ${fname}: ${e.message}`);
    }
  }

  return { version, downloaded };
}

async function main() {
  fs.mkdirSync(PLUGIN_DIR, { recursive: true });
  console.log(`Installing 9 plugins to: ${PLUGIN_DIR}\n`);

  const results = [];
  for (const plugin of PLUGINS) {
    process.stdout.write(`[${plugin.id}] `);
    try {
      const { version, downloaded } = await installPlugin(plugin);
      console.log(`✓ ${version} (${downloaded} files)`);
      results.push({ id: plugin.id, version, ok: true });
    } catch (e) {
      console.log(`✗ ${e.message}`);
      results.push({ id: plugin.id, ok: false, error: e.message });
    }
  }

  const ok = results.filter(r => r.ok).length;
  console.log(`\n=== DONE: ${ok}/${PLUGINS.length} plugins installed ===`);

  // Pre-config plugin data
  console.log('\nWriting plugin pre-config...');
  preConfigPlugins();
  console.log('✓ Templater configured (templates_folder = 09-Templates)');
  console.log('✓ Periodic Notes configured (daily folder + template)');
  console.log('✓ Obsidian Git configured (auto-pull on startup)');

  // Update community-plugins.json (enable all)
  const enabledIds = results.filter(r => r.ok).map(r => r.id);
  const cpPath = path.resolve(PLUGIN_DIR, '../community-plugins.json');
  fs.writeFileSync(cpPath, JSON.stringify(enabledIds, null, 2));
  console.log(`✓ Enabled ${enabledIds.length} plugins in community-plugins.json`);

  console.log('\n📝 Next: buka Obsidian → Open folder as vault → docs/vault/');
  console.log('   Plugin akan auto-detect & aktif.');
}

function preConfigPlugins() {
  // Templater: templates_folder + folder_templates
  const templaterDir = path.join(PLUGIN_DIR, 'templater-obsidian');
  if (fs.existsSync(templaterDir)) {
    fs.writeFileSync(path.join(templaterDir, 'data.json'), JSON.stringify({
      command_timeout: 5,
      templates_folder: '09-Templates',
      templates_pairs: [['', '']],
      trigger_on_file_creation: true,
      auto_jump_to_cursor: true,
      enable_system_commands: false,
      shell_path: '',
      user_scripts_folder: '',
      enable_folder_templates: true,
      folder_templates: [
        { folder: '01-Kasus', template: '09-Templates/template-kasus.md' },
        { folder: '02-Narasumber', template: '09-Templates/template-narasumber.md' },
        { folder: '03-Hukum/Pasal', template: '09-Templates/template-pasal.md' },
        { folder: '03-Hukum/Yurisprudensi', template: '09-Templates/template-yurisprudensi.md' },
        { folder: '04-Topik-Riset', template: '09-Templates/template-topic-cluster.md' },
        { folder: '06-Sidang', template: '09-Templates/template-sidang-note.md' },
        { folder: '07-Drafts', template: '09-Templates/template-artikel-draft.md' },
      ],
      syntax_highlighting: true,
      syntax_highlighting_mobile: false,
      enabled_templates_hotkeys: [''],
      startup_templates: ['']
    }, null, 2));
  }

  // Periodic Notes
  const pnDir = path.join(PLUGIN_DIR, 'periodic-notes');
  if (fs.existsSync(pnDir)) {
    fs.writeFileSync(path.join(pnDir, 'data.json'), JSON.stringify({
      showGettingStartedBanner: false,
      hasMigratedDailyNoteSettings: true,
      hasMigratedWeeklyNoteSettings: true,
      daily: {
        available: true,
        format: 'YYYY-MM-DD',
        folder: '05-Editorial/Daily-Log',
        template: '09-Templates/template-daily-log',
        enabled: true,
      },
      weekly: {
        available: true,
        format: 'gggg-[W]ww',
        folder: '05-Editorial/Calendar',
        template: '',
        enabled: false,
      },
      monthly: { available: false, format: '', folder: '', template: '', enabled: false },
      quarterly: { available: false, format: '', folder: '', template: '', enabled: false },
      yearly: { available: false, format: '', folder: '', template: '', enabled: false },
    }, null, 2));
  }

  // Obsidian Git: auto-pull on startup, push on backup
  const gitDir = path.join(PLUGIN_DIR, 'obsidian-git');
  if (fs.existsSync(gitDir)) {
    fs.writeFileSync(path.join(gitDir, 'data.json'), JSON.stringify({
      commitMessage: 'vault: auto-backup {{date}}',
      commitDateFormat: 'YYYY-MM-DD HH:mm:ss',
      autoSaveInterval: 30,
      autoPullInterval: 60,
      autoPullOnBoot: true,
      pullBeforePush: true,
      disablePopups: false,
      listChangedFilesInMessageBody: false,
      showStatusBar: true,
      updateSubmodules: false,
      syncMethod: 'merge',
      gitPath: '',
      customMessageOnAutoBackup: false,
      autoBackupAfterFileChange: false,
      treeStructure: false,
      refreshSourceControl: true,
      basePath: '',
      differentIntervalCommitAndPush: false,
      autoPushInterval: 0,
      mergeOnPull: true,
      submoduleRecurseCheckout: false,
      lineAuthor: { show: false, followMovement: 'inactive', showCommitHash: false, authorDisplay: 'initials', dateTimeFormatOptions: 'date', dateTimeFormatCustomString: 'YYYY-MM-DD HH:mm', dateTimeTimezone: 'viewer-local', coloringMaxAge: '1y', colorNew: { r: 255, g: 150, b: 150 }, colorOld: { r: 120, g: 160, b: 255 }, textColorCss: 'var(--text-muted)', ignoreWhitespace: false, gutterSpacingFallbackLength: 5 }
    }, null, 2));
  }

  // Calendar — basic config
  const calDir = path.join(PLUGIN_DIR, 'calendar');
  if (fs.existsSync(calDir)) {
    fs.writeFileSync(path.join(calDir, 'data.json'), JSON.stringify({
      shouldConfirmBeforeCreate: true,
      weekStart: 'monday',
      wordsPerDot: 250,
    }, null, 2));
  }

  // Linter: basic auto-format
  const linterDir = path.join(PLUGIN_DIR, 'obsidian-linter');
  if (fs.existsSync(linterDir)) {
    fs.writeFileSync(path.join(linterDir, 'data.json'), JSON.stringify({
      ruleConfigs: {
        'trailing-spaces': { enabled: true },
        'consecutive-blank-lines': { enabled: true },
        'remove-empty-lines-around-headings': { enabled: false },
      },
      lintOnSave: false,
      displayChanged: true,
      foldersToIgnore: [],
      linterLocale: 'system-default',
    }, null, 2));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
