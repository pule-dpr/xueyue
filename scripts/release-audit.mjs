import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const auditOnly = process.argv.includes('--audit');
const root = process.cwd();
const blockers = [];
const warnings = [];
const passed = [];

const appJson = JSON.parse(await readFile(path.join(root, 'app.json'), 'utf8'));
const easJson = JSON.parse(await readFile(path.join(root, 'eas.json'), 'utf8'));
const privacy = await readFile(path.join(root, 'store-site/privacy.html'), 'utf8');
const support = await readFile(path.join(root, 'store-site/support.html'), 'utf8');
const app = appJson.expo;

check(app?.name === '雪约', '应用名称为“雪约”。', '应用名称未确认。');
check(Boolean(app?.version), `应用版本为 ${app?.version}。`, '缺少应用版本。');
check(
  easJson.cli?.appVersionSource === 'remote' ||
    (Number.isInteger(app?.android?.versionCode) && app.android.versionCode > 0),
  easJson.cli?.appVersionSource === 'remote'
    ? 'Android versionCode 使用 EAS 远程自动递增。'
    : `Android versionCode 为 ${app?.android?.versionCode}。`,
  'Android versionCode 未配置，且未使用 EAS 远程版本源。',
);
check(
  /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(app?.android?.package || ''),
  `Android 包名格式有效：${app?.android?.package}`,
  'Android 包名格式无效。',
);
if (!app?.extra?.eas?.projectId) {
  blockers.push('尚未关联 EAS 项目。登录 Expo 后运行 npx eas-cli@latest init。');
}

check(
  ['production', 'preview', 'development'].every(
    (profile) => easJson.build?.[profile]?.environment === profile,
  ),
  'EAS 三个构建 profile 已绑定独立环境。',
  'eas.json 构建 profile 未完整绑定 EAS 环境。',
);
check(
  easJson.build?.production?.android?.buildType === 'app-bundle',
  '生产构建输出 AAB。',
  '生产构建不是 app-bundle。',
);
check(
  easJson.submit?.production?.android?.track === 'internal',
  '首次自动提交目标为 Google Play internal 轨道。',
  'Google Play 提交轨道未配置。',
);

const placeholders = [
  '[联系邮箱]',
  '[开发者名称]',
  '[部署后的公开 URL]',
  '[开发者或公司全称]',
];
const publicMaterials = `${privacy}\n${support}`;
const foundPlaceholders = placeholders.filter((placeholder) =>
  publicMaterials.includes(placeholder),
);
check(
  foundPlaceholders.length === 0,
  '公开隐私页与支持页没有未替换占位符。',
  `公开页面仍含占位符：${foundPlaceholders.join('、')}`,
);

const serviceAccountPath = path.join(
  root,
  easJson.submit?.production?.android?.serviceAccountKeyPath || '',
);
await checkFile(
  serviceAccountPath,
  'Google Play 服务账号密钥存在。',
  '缺少 secrets/play-service-account.json，无法自动上传 Google Play。',
);

const screenshotsDir = path.join(root, 'store/screenshots');
const screenshots = (await readdir(screenshotsDir))
  .filter((file) => /^v2-\d{2}-.+\.png$/.test(file))
  .sort();
check(
  screenshots.length >= 4 && screenshots.length <= 8,
  `商店截图数量有效：${screenshots.length} 张。`,
  `商店截图应为 4–8 张，当前 ${screenshots.length} 张。`,
);
for (const file of screenshots) {
  const metadata = await sharp(path.join(screenshotsDir, file)).metadata();
  check(
    metadata.width === 1082 && metadata.height === 2202,
    `${file} 尺寸为 1082×2202。`,
    `${file} 尺寸为 ${metadata.width}×${metadata.height}，应为 1082×2202。`,
  );
}

const artwork = [
  ['store/icon-512.png', 512, 512],
  ['store/feature-graphic-1024x500.png', 1024, 500],
  ['assets/icon.png', 1024, 1024],
];
for (const [file, width, height] of artwork) {
  const metadata = await sharp(path.join(root, file)).metadata();
  check(
    metadata.width === width && metadata.height === height,
    `${file} 尺寸为 ${width}×${height}。`,
    `${file} 尺寸错误：${metadata.width}×${metadata.height}。`,
  );
}

await checkFile(
  path.join(root, '.easignore'),
  '.easignore 已配置，发布构建不会上传本地数据库和密钥。',
  '缺少 .easignore，构建可能包含本地环境或测试文件。',
);

const productionApiUrl = process.env.EXPO_PUBLIC_API_URL;
if (productionApiUrl && /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(productionApiUrl)) {
  blockers.push('生产 API 地址仍是本机地址，Android 实机和商店版本将无法访问。');
}

const onboardingSource = await readFile(path.join(root, 'src/app/onboarding.tsx'), 'utf8');
if (onboardingSource.includes('本地演示认证')) {
  warnings.push('客户端仍包含本地演示认证文案；正式包应接入生产 API 或隐藏未开放认证。');
}

const dataSafety = await readFile(path.join(root, 'docs/STORE_LISTING.md'), 'utf8');
if (!dataSafety.includes('服务端')) {
  warnings.push('商店 Data Safety 文案未说明可选服务端 API，提交前必须按最终构建重新核对。');
}

console.log('雪约发布审计\n');
for (const message of passed) console.log(`PASS  ${message}`);
for (const message of warnings) console.log(`WARN  ${message}`);
for (const message of blockers) console.log(`BLOCK ${message}`);

console.log(
  `\n结果：${passed.length} 项通过，${warnings.length} 项警告，${blockers.length} 项阻塞。`,
);

if (blockers.length > 0 && !auditOnly) {
  process.exitCode = 1;
}

function check(condition, success, failure) {
  if (condition) passed.push(success);
  else blockers.push(failure);
}

async function checkFile(filePath, success, failure) {
  try {
    await access(filePath);
    passed.push(success);
  } catch {
    blockers.push(failure);
  }
}
