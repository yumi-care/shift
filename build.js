const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendDir = path.join(__dirname, 'frontend');

// Install frontend dependencies
console.log('Installing frontend dependencies...');
execSync('npm install --legacy-peer-deps', { cwd: frontendDir, stdio: 'inherit' });

// Build frontend
console.log('Building frontend...');
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

// Copy to public directory
const src = 'frontend/dist';
const dst = 'public';

console.log('Copying dist to public...');
if (!fs.existsSync(dst)) {
  fs.mkdirSync(dst, { recursive: true });
}

const copyDir = (source, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  fs.readdirSync(source).forEach(file => {
    const srcPath = path.join(source, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

copyDir(src, dst);

// Copy api directory to public
console.log('Copying api to public...');
if (fs.existsSync('api')) {
  copyDir('api', path.join(dst, 'api'));
}

console.log('Done!');
