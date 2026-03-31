#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Read package.json to get current version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

// Generate IPK filename
const ipkFilename = `org.moonfinplus.webos_${version}_all.ipk`;
const rootDir = path.resolve(__dirname, '..', '..');
const ipkPath = path.join(rootDir, ipkFilename);

// Check if IPK exists
if (!fs.existsSync(ipkPath)) {
	console.error(`Error: IPK file not found at ${ipkPath}`);
	console.error('Please run "npm run package" first to build the IPK.');
	process.exit(1);
}

// Calculate SHA256 hash
const fileBuffer = fs.readFileSync(ipkPath);
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);
const sha256 = hashSum.digest('hex');

console.log(`Calculated SHA256: ${sha256}`);

// Read manifest file
const manifestPath = './org.moonfinplus.webos.manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.version = version;
manifest.ipkUrl = `https://github.com/WJStephenson/moonfin-tv/releases/download/v${version}/${ipkFilename}`;
if (!manifest.ipkHash) manifest.ipkHash = {};
manifest.ipkHash.sha256 = sha256;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`✓ Updated ${manifestPath}`);
console.log(`  Version: ${version}`);
console.log(`  IPK: ${ipkFilename}`);
console.log(`  SHA256: ${sha256}`);

const homebrewRepoPath = path.join(__dirname, 'homebrew-repo.json');
if (fs.existsSync(homebrewRepoPath)) {
	const repo = JSON.parse(fs.readFileSync(homebrewRepoPath, 'utf8'));
	const pkg = repo.packages && repo.packages[0];
	if (pkg && pkg.manifest) {
		pkg.manifest.version = version;
		pkg.manifest.ipkUrl = manifest.ipkUrl;
		pkg.manifest.ipkHash = {sha256};
		if (repo.paging) {
			repo.paging.itemsTotal = repo.packages.length;
			repo.paging.count = repo.packages.length;
			repo.paging.maxPage = 1;
		}
		fs.writeFileSync(homebrewRepoPath, JSON.stringify(repo, null, 2) + '\n', 'utf8');
		console.log(`✓ Updated ${path.relative(process.cwd(), homebrewRepoPath)}`);
	}
}
