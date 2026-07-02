const { execSync } = require('child_process');

console.log('Running migrations...');
try {
  // Use the standard migration command for SceneFlow Next.js structure
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
  console.log('Migrations complete!');
} catch (error) {
  console.error('Error running migrations:', error);
}
